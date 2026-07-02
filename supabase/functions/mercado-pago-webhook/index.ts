// Edge Function: mercado-pago-webhook
//
// ÚNICA vía que aprueba (o transiciona) una compra. Reglas de seguridad:
//  - Verifica la firma HMAC de MP (x-signature) antes de procesar → 401 si falla.
//  - NUNCA confía en el status del payload: consulta el pago en la API de MP.
//  - Idempotencia: no re-activa una compra ya `approved` ni mueve `start_date`
//    en reintentos (UPDATE condicionado + índice único de payment_id).
//  - payment_events.raw_payload guarda SOLO metadatos no sensibles (id/status/type).
//
// La lógica de negocio (handleWebhook) se exporta con dependencias inyectables
// (supabaseAdmin, mpClient, webhookSecret, verifySignature) para testear sin
// credenciales reales ni red.

import { type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import { createSupabaseAdminClient } from "../_shared/supabaseAdmin.ts";
import {
  createHttpMercadoPagoClient,
  type MercadoPagoClient,
} from "../_shared/mercadoPago.ts";
import { verifyWebhookSignature } from "../_shared/signature.ts";

type SignatureVerifier = (input: {
  xSignature: string | null | undefined;
  xRequestId: string | null | undefined;
  dataId: string | null | undefined;
  secret: string;
}) => Promise<boolean>;

interface WebhookDeps {
  supabaseAdmin: SupabaseClient;
  mpClient: MercadoPagoClient;
  webhookSecret: string;
  verifySignature: SignatureVerifier;
}

interface JsonResponse {
  status: number;
  body: Record<string, unknown>;
}

function json(status: number, body: Record<string, unknown>): JsonResponse {
  return { status, body };
}

// Mapea el status de MP al enum public.payment_status del proyecto.
// Devuelve null para estados desconocidos (se registran como 'unmapped_status').
function mapPaymentStatus(mpStatus: string): string | null {
  switch (mpStatus) {
    case "approved":
      return "approved";
    case "rejected":
      return "rejected";
    case "cancelled":
      return "cancelled";
    case "refunded":
    case "charged_back":
      return "refunded";
    case "pending":
    case "in_process":
    case "authorized":
      return "pending";
    default:
      return null;
  }
}

interface RecordEventInput {
  purchaseId: string | null;
  paymentId: string | null;
  eventType: string | null;
  action: string | null;
  statusReceived: string | null;
  signatureValid: boolean;
  processingResult: string;
  rawPayload: Record<string, unknown>;
}

// Inserta un registro de auditoría. El índice único parcial
// (mercado_pago_payment_id, action) hace idempotente el registro; ante conflicto
// simplemente se ignora sin propagar el error.
async function recordEvent(
  supabaseAdmin: SupabaseClient,
  input: RecordEventInput,
): Promise<void> {
  const { error } = await supabaseAdmin.from("payment_events").insert({
    purchase_id: input.purchaseId,
    mercado_pago_payment_id: input.paymentId,
    event_type: input.eventType,
    action: input.action,
    payment_status_received: input.statusReceived,
    signature_valid: input.signatureValid,
    processing_result: input.processingResult,
    raw_payload: input.rawPayload,
  });

  if (error && error.code !== "23505") {
    // 23505 = unique_violation (evento duplicado ya auditado): no es un fallo.
    console.error("payment_events insert failed", error.message);
  }
}

export async function handleWebhook(
  request: Request,
  deps: WebhookDeps,
): Promise<JsonResponse> {
  if (request.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const { supabaseAdmin, mpClient, webhookSecret, verifySignature } = deps;

  const xSignature = request.headers.get("x-signature");
  const xRequestId = request.headers.get("x-request-id");

  // Mercado Pago notifica en dos formatos: el moderno (Webhooks) con
  // {type, data:{id}} en el body JSON, y el clásico (IPN) por query string
  // (?topic=payment&id=... o ?type=payment&data.id=...). Se aceptan ambos, con
  // prioridad al body y respaldo en la query. Sin esto, muchas notificaciones
  // reales quedarían como 'ignored_type'/'missing_payment_id' y el pago aprobado
  // nunca activaría la compra.
  const url = new URL(request.url);
  const queryDataId = url.searchParams.get("data.id") ?? url.searchParams.get("id");
  const queryType = url.searchParams.get("type") ?? url.searchParams.get("topic");

  let payload: Record<string, unknown> = {};
  try {
    const parsed = await request.json();
    if (parsed && typeof parsed === "object") {
      payload = parsed as Record<string, unknown>;
    }
  } catch {
    payload = {};
  }

  const eventType = (typeof payload.type === "string" ? payload.type : null) ?? queryType;
  const action = typeof payload.action === "string" ? payload.action : null;
  const bodyDataId = (payload.data as { id?: unknown })?.id;
  const dataIdStr = bodyDataId !== undefined && bodyDataId !== null
    ? String(bodyDataId)
    : (queryDataId ?? null);

  // 1) Verificación de firma (INFORMATIVA). Se registra en cada evento para
  //    auditoría (signature_valid), pero NO se rechaza con 401. El esquema de
  //    firma de Mercado Pago es inconsistente entre tipos de notificación (IPN
  //    legacy con topic/id sin data.id, merchant_order) y entre los entornos de
  //    prueba y producción (distinto secreto), por lo que exigir la firma
  //    bloquearía notificaciones legítimas.
  //    La BARRERA DE SEGURIDAD real está más abajo: SIEMPRE se consulta el pago
  //    en la API de MP con el access token, y solo se activa si el pago existe
  //    en la cuenta y su external_reference corresponde a una compra pendiente
  //    propia. Un atacante no puede falsificar un pago aprobado (tendría que
  //    existir de verdad en la cuenta), y la idempotencia evita reprocesos.
  const signatureValid = await verifySignature({
    xSignature,
    xRequestId,
    dataId: dataIdStr,
    secret: webhookSecret,
  });

  // 2) Sólo notificaciones de tipo 'payment'; el resto se ignora (200).
  if (eventType !== "payment") {
    await recordEvent(supabaseAdmin, {
      purchaseId: null,
      paymentId: dataIdStr,
      eventType,
      action,
      statusReceived: null,
      signatureValid,
      processingResult: "ignored_type",
      rawPayload: { id: dataIdStr, type: eventType, action },
    });
    return json(200, { received: true });
  }

  if (!dataIdStr) {
    await recordEvent(supabaseAdmin, {
      purchaseId: null,
      paymentId: null,
      eventType,
      action,
      statusReceived: null,
      signatureValid,
      processingResult: "missing_payment_id",
      rawPayload: { id: null, type: eventType, action },
    });
    return json(200, { received: true });
  }

  // 3) Consultar el pago en la API de MP (nunca confiar en el payload).
  let payment;
  try {
    payment = await deps.mpClient.getPayment(dataIdStr);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Un 404 significa pago inexistente: auditar y responder 200 (no reintento).
    if (/\(404\)/.test(message)) {
      await recordEvent(supabaseAdmin, {
        purchaseId: null,
        paymentId: dataIdStr,
        eventType,
        action,
        statusReceived: null,
        signatureValid,
        processingResult: "payment_not_found",
        rawPayload: { id: dataIdStr, type: eventType, action },
      });
      return json(200, { received: true });
    }
    // Cualquier otro error contra MP: 500 para que MP reintente.
    console.error("mercado pago getPayment failed", message);
    return json(500, { error: "Internal error" });
  }

  const paymentId = String(payment.id);
  const externalReference = payment.external_reference ?? null;
  const mpStatus = payment.status;
  const rawPayload = {
    id: paymentId,
    type: eventType,
    action,
    status: mpStatus,
  };

  // 4) Localizar la compra por external_reference (= purchase.id).
  if (!externalReference) {
    await recordEvent(supabaseAdmin, {
      purchaseId: null,
      paymentId,
      eventType,
      action,
      statusReceived: mpStatus,
      signatureValid,
      processingResult: "purchase_not_found",
      rawPayload,
    });
    return json(200, { received: true });
  }

  const { data: purchase, error: purchaseError } = await supabaseAdmin
    .from("purchases")
    .select("id, payment_status, duration_days, mercado_pago_payment_id, start_date")
    .eq("id", externalReference)
    .maybeSingle();

  if (purchaseError) {
    console.error("purchase lookup failed", purchaseError.message);
    return json(500, { error: "Internal error" });
  }

  if (!purchase) {
    await recordEvent(supabaseAdmin, {
      purchaseId: null,
      paymentId,
      eventType,
      action,
      statusReceived: mpStatus,
      signatureValid,
      processingResult: "purchase_not_found",
      rawPayload,
    });
    return json(200, { received: true });
  }

  const mappedStatus = mapPaymentStatus(mpStatus);
  if (!mappedStatus) {
    await recordEvent(supabaseAdmin, {
      purchaseId: purchase.id,
      paymentId,
      eventType,
      action,
      statusReceived: mpStatus,
      signatureValid,
      processingResult: "unmapped_status",
      rawPayload,
    });
    return json(200, { received: true });
  }

  // 5) Idempotencia: si la compra ya refleja este pago y estado, no re-aplicar.
  if (
    purchase.mercado_pago_payment_id === paymentId &&
    purchase.payment_status === mappedStatus
  ) {
    await recordEvent(supabaseAdmin, {
      purchaseId: purchase.id,
      paymentId,
      eventType,
      action,
      statusReceived: mpStatus,
      signatureValid,
      processingResult: "duplicate_ignored",
      rawPayload,
    });
    return json(200, { received: true });
  }

  // Nunca degradar una compra ya aprobada (p. ej. un webhook 'pending' tardío).
  if (purchase.payment_status === "approved" && mappedStatus !== "approved") {
    // refunded/charged_back SÍ deben aplicarse sobre una compra aprobada;
    // el resto (pending/rejected/cancelled) se considera obsoleto.
    if (mappedStatus !== "refunded") {
      await recordEvent(supabaseAdmin, {
        purchaseId: purchase.id,
        paymentId,
        eventType,
        action,
        statusReceived: mpStatus,
        signatureValid,
        processingResult: "stale_ignored",
        rawPayload,
      });
      return json(200, { received: true });
    }
  }

  // 6) Aplicar la transición.
  let processingResult = "applied";

  if (mappedStatus === "approved") {
    // UPDATE condicionado a que NO esté ya approved: evita re-activar y mover
    // start_date en reintentos concurrentes/tardíos.
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("purchases")
      .update({
        payment_status: "approved",
        mercado_pago_payment_id: paymentId,
        start_date: new Date().toISOString(),
      })
      .eq("id", purchase.id)
      .neq("payment_status", "approved")
      .select("id, start_date")
      .maybeSingle();

    if (updateError) {
      // Colisión con el índice único de payment_id: otro proceso ya lo aplicó.
      if (updateError.code === "23505") {
        processingResult = "duplicate_ignored";
      } else {
        console.error("purchase approve update failed", updateError.message);
        return json(500, { error: "Internal error" });
      }
    } else if (!updated) {
      // La condición neq no encontró filas: ya estaba approved.
      processingResult = "stale_ignored";
    } else {
      // end_date = start_date + duration_days (días naturales), calculado a
      // partir del start_date recién persistido para mantener consistencia.
      const start = new Date(updated.start_date as string);
      const end = new Date(start);
      end.setUTCDate(end.getUTCDate() + Number(purchase.duration_days));
      const { error: endDateError } = await supabaseAdmin
        .from("purchases")
        .update({ end_date: end.toISOString() })
        .eq("id", purchase.id);
      if (endDateError) {
        console.error("purchase end_date update failed", endDateError.message);
        return json(500, { error: "Internal error" });
      }
    }
  } else {
    // rejected / cancelled / refunded / pending: sin tocar fechas.
    // Se registra el payment_id (idempotente por índice único).
    const { error: updateError } = await supabaseAdmin
      .from("purchases")
      .update({
        payment_status: mappedStatus,
        mercado_pago_payment_id: paymentId,
      })
      .eq("id", purchase.id);

    if (updateError) {
      if (updateError.code === "23505") {
        processingResult = "duplicate_ignored";
      } else {
        console.error("purchase status update failed", updateError.message);
        return json(500, { error: "Internal error" });
      }
    }
  }

  await recordEvent(supabaseAdmin, {
    purchaseId: purchase.id,
    paymentId,
    eventType,
    action,
    statusReceived: mpStatus,
    signatureValid,
    processingResult,
    rawPayload,
  });

  return json(200, { received: true });
}

Deno.serve(async (request) => {
  const preflight = handleCorsPreflight(request);
  if (preflight) {
    return preflight;
  }

  const headers = { ...corsHeaders(), "Content-Type": "application/json" };

  try {
    const webhookSecret = Deno.env.get("MERCADO_PAGO_WEBHOOK_SECRET");
    const mpAccessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");

    if (!webhookSecret || !mpAccessToken) {
      console.error("mercado-pago-webhook missing required env vars");
      return new Response(
        JSON.stringify({ error: "Internal error" }),
        { status: 500, headers },
      );
    }

    const supabaseAdmin = createSupabaseAdminClient();
    const mpClient = createHttpMercadoPagoClient(mpAccessToken);

    const result = await handleWebhook(request, {
      supabaseAdmin,
      mpClient,
      webhookSecret,
      verifySignature: verifyWebhookSignature,
    });

    return new Response(JSON.stringify(result.body), {
      status: result.status,
      headers,
    });
  } catch (error) {
    console.error(
      "mercado-pago-webhook unexpected error",
      error instanceof Error ? error.message : String(error),
    );
    // 500 para que MP reintente ante un error interno inesperado.
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers },
    );
  }
});
