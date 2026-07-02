// Edge Function: create-payment-preference
//
// Crea una preferencia de pago en Mercado Pago y una compra `pending` asociada
// al usuario autenticado. El snapshot de la compra (nombre/monto/moneda/duración)
// SIEMPRE se toma de la tabla `packages` leída con service role, NUNCA del body
// del request (así un `amount` manipulado por el cliente se ignora).
//
// La aprobación de la compra ocurre EXCLUSIVAMENTE en el webhook; aquí sólo se
// deja la compra en estado `pending`.
//
// La lógica de negocio (handleCreatePreference) se exporta con dependencias
// inyectables (supabaseAdmin, mpClient, appUrl, notificationUrl) para poder
// testearla sin credenciales reales ni red.

import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import { createSupabaseAdminClient } from "../_shared/supabaseAdmin.ts";
import {
  createHttpMercadoPagoClient,
  type MercadoPagoClient,
} from "../_shared/mercadoPago.ts";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface CreatePreferenceDeps {
  supabaseAdmin: SupabaseClient;
  mpClient: MercadoPagoClient;
  // URL pública del frontend (para back_urls). Sin barra final.
  appUrl: string;
  // URL del webhook (SUPABASE_URL/functions/v1/mercado-pago-webhook).
  notificationUrl: string;
  // Resuelve el usuario autenticado a partir del header Authorization.
  // Se inyecta para poder testear sin un servidor de auth real.
  getUserFromToken(token: string): Promise<{ id: string } | null>;
}

interface JsonResponse {
  status: number;
  body: Record<string, unknown>;
}

function json(status: number, body: Record<string, unknown>): JsonResponse {
  return { status, body };
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

// Lógica de negocio pura respecto a la red externa: recibe el request y sus
// dependencias, devuelve status + body. No toca Deno.serve ni CORS.
export async function handleCreatePreference(
  request: Request,
  deps: CreatePreferenceDeps,
): Promise<JsonResponse> {
  if (request.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  // 1) Autenticación: extraer y validar el JWT.
  const authHeader = request.headers.get("Authorization") ??
    request.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return json(401, { error: "Unauthorized" });
  }

  const user = await deps.getUserFromToken(token);
  if (!user) {
    return json(401, { error: "Unauthorized" });
  }

  // 2) Body: package_id validado como UUID.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: "Invalid request body" });
  }

  const packageId = (body as { package_id?: unknown })?.package_id;
  if (typeof packageId !== "string" || !UUID_REGEX.test(packageId)) {
    return json(400, { error: "Invalid package_id" });
  }

  // 3) Snapshot desde `packages` con service role (fuente de verdad del monto).
  const { data: pkg, error: pkgError } = await deps.supabaseAdmin
    .from("packages")
    .select("id, name, price, currency, duration_days, is_active")
    .eq("id", packageId)
    .maybeSingle();

  if (pkgError) {
    console.error("packages lookup failed", pkgError.message);
    return json(500, { error: "Internal error" });
  }
  if (!pkg) {
    return json(404, { error: "Package not found" });
  }
  if (!pkg.is_active) {
    return json(409, { error: "Package not available" });
  }

  // 4) Insertar la compra en `pending` con el snapshot del paquete.
  const { data: purchase, error: insertError } = await deps.supabaseAdmin
    .from("purchases")
    .insert({
      user_id: user.id,
      package_id: pkg.id,
      package_name: pkg.name,
      amount: pkg.price,
      currency: pkg.currency,
      duration_days: pkg.duration_days,
      payment_status: "pending",
    })
    .select("id")
    .single();

  if (insertError || !purchase) {
    console.error("purchase insert failed", insertError?.message);
    return json(500, { error: "Internal error" });
  }

  // 5) Crear la preferencia en Mercado Pago.
  const appUrl = stripTrailingSlash(deps.appUrl);
  let preference;
  try {
    preference = await deps.mpClient.createPreference({
      items: [
        {
          title: pkg.name,
          quantity: 1,
          unit_price: Number(pkg.price),
          currency_id: pkg.currency,
        },
      ],
      external_reference: purchase.id,
      back_urls: {
        success: `${appUrl}/payment/success`,
        failure: `${appUrl}/payment/failure`,
        pending: `${appUrl}/payment/pending`,
      },
      auto_return: "approved",
      notification_url: deps.notificationUrl,
    });
  } catch (error) {
    console.error(
      "mercado pago createPreference failed",
      error instanceof Error ? error.message : String(error),
    );
    return json(502, { error: "Payment provider error" });
  }

  if (!preference?.id || !preference.init_point) {
    console.error("mercado pago returned an incomplete preference");
    return json(502, { error: "Payment provider error" });
  }

  // 6) Guardar el preference_id en la compra.
  const { error: updateError } = await deps.supabaseAdmin
    .from("purchases")
    .update({ mercado_pago_preference_id: preference.id })
    .eq("id", purchase.id);

  if (updateError) {
    console.error("purchase preference update failed", updateError.message);
    return json(500, { error: "Internal error" });
  }

  return json(200, {
    init_point: preference.init_point,
    purchase_id: purchase.id,
  });
}

Deno.serve(async (request) => {
  const preflight = handleCorsPreflight(request);
  if (preflight) {
    return preflight;
  }

  const headers = { ...corsHeaders(), "Content-Type": "application/json" };

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const appUrl = Deno.env.get("APP_URL");
    const mpAccessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");

    if (!supabaseUrl || !anonKey || !appUrl || !mpAccessToken) {
      console.error("create-payment-preference missing required env vars");
      return new Response(
        JSON.stringify({ error: "Internal error" }),
        { status: 500, headers },
      );
    }

    const supabaseAdmin = createSupabaseAdminClient();
    const mpClient = createHttpMercadoPagoClient(mpAccessToken);
    const notificationUrl =
      `${stripTrailingSlash(supabaseUrl)}/functions/v1/mercado-pago-webhook`;

    // Valida el JWT usando un client anon con el token del usuario.
    const getUserFromToken = async (token: string) => {
      const authClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data, error } = await authClient.auth.getUser();
      if (error || !data?.user) {
        return null;
      }
      return { id: data.user.id };
    };

    const result = await handleCreatePreference(request, {
      supabaseAdmin,
      mpClient,
      appUrl,
      notificationUrl,
      getUserFromToken,
    });

    return new Response(JSON.stringify(result.body), {
      status: result.status,
      headers,
    });
  } catch (error) {
    console.error(
      "create-payment-preference unexpected error",
      error instanceof Error ? error.message : String(error),
    );
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers },
    );
  }
});
