// Tests de la lógica de negocio de mercado-pago-webhook.
// Todo mockeado: verificador de firma inyectable, MercadoPagoClient falso y un
// doble ESTATAL del client supabase admin que mantiene la compra en memoria para
// poder demostrar idempotencia (un reenvío no mueve start_date).
// No requiere MERCADO_PAGO_WEBHOOK_SECRET ni MERCADO_PAGO_ACCESS_TOKEN reales.
//
// Ejecutar: deno test --allow-env --allow-net --allow-read supabase/functions/

import { assertEquals, assertExists } from "jsr:@std/assert@1";
import { handleWebhook } from "./index.ts";
import type {
  MercadoPagoClient,
  MercadoPagoPayment,
} from "../_shared/mercadoPago.ts";

const SECRET = "test-secret";
const PURCHASE_ID = "33333333-3333-4333-8333-333333333333";

interface PurchaseState {
  id: string;
  payment_status: string;
  duration_days: number;
  mercado_pago_payment_id: string | null;
  start_date: string | null;
  end_date: string | null;
}

interface FakeAdmin {
  // deno-lint-ignore no-explicit-any
  client: any;
  purchase: PurchaseState | null;
  events: Record<string, unknown>[];
}

// Doble estatal: soporta las cadenas que usa el webhook contra `purchases` y el
// insert append-only de `payment_events`. La condición `.neq('payment_status',
// 'approved')` del approve se respeta de verdad para probar el UPDATE condicionado.
function createFakeAdmin(initial: PurchaseState | null): FakeAdmin {
  const state = { purchase: initial ? { ...initial } : null };
  const events: Record<string, unknown>[] = [];

  function purchasesBuilder() {
    // Filtros acumulados de la cadena select/update.
    let matched = true; // se vuelve false si algún .neq no coincide
    let pending: Record<string, unknown> | null = null; // valores del update

    const builder = {
      // SELECT
      select() {
        return builder;
      },
      eq(_col: string, _val: unknown) {
        return builder;
      },
      neq(col: string, val: unknown) {
        // Aplica la condición del UPDATE condicionado sobre el estado actual.
        if (state.purchase && (state.purchase as Record<string, unknown>)[col] === val) {
          matched = false;
        }
        return builder;
      },
      maybeSingle() {
        if (pending) {
          // Es un UPDATE ... select().maybeSingle()
          if (!state.purchase || !matched) {
            return Promise.resolve({ data: null, error: null });
          }
          Object.assign(state.purchase, pending);
          return Promise.resolve({
            data: { ...state.purchase },
            error: null,
          });
        }
        // Es un SELECT ... maybeSingle()
        return Promise.resolve({
          data: state.purchase ? { ...state.purchase } : null,
          error: null,
        });
      },
      // UPDATE: guarda los valores; se aplican al resolver (maybeSingle o await).
      update(values: Record<string, unknown>) {
        pending = values;
        return builder;
      },
      // Para la rama sin select (UPDATE ... eq()) el builder es awaitable.
      then(
        resolve: (value: { data: unknown; error: unknown }) => unknown,
      ) {
        if (pending && state.purchase && matched) {
          Object.assign(state.purchase, pending);
        }
        return Promise.resolve({ data: null, error: null }).then(resolve);
      },
    };
    return builder;
  }

  const client = {
    from(table: string) {
      if (table === "purchases") {
        return purchasesBuilder();
      }
      if (table === "payment_events") {
        return {
          insert(row: Record<string, unknown>) {
            events.push(row);
            return Promise.resolve({ data: null, error: null });
          },
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  };

  return {
    client,
    get purchase() {
      return state.purchase;
    },
    events,
  };
}

function createMpClient(payment: MercadoPagoPayment | Error): MercadoPagoClient {
  return {
    createPreference: () =>
      Promise.reject(new Error("createPreference not used in webhook")),
    getPayment: () =>
      payment instanceof Error ? Promise.reject(payment) : Promise.resolve(payment),
  };
}

function makeRequest(payload: unknown): Request {
  return new Request("https://sb.example.test/functions/v1/mercado-pago-webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-signature": "ts=1,v1=deadbeef",
      "x-request-id": "req-1",
    },
    body: JSON.stringify(payload),
  });
}

const paymentNotification = { type: "payment", action: "payment.updated", data: { id: "MP-1" } };

function alwaysValid() {
  return Promise.resolve(true);
}
function alwaysInvalid() {
  return Promise.resolve(false);
}

function deps(admin: FakeAdmin, mp: MercadoPagoClient, verify = alwaysValid) {
  return {
    // deno-lint-ignore no-explicit-any
    supabaseAdmin: admin.client as any,
    mpClient: mp,
    webhookSecret: SECRET,
    verifySignature: verify,
  };
}

function pendingPurchase(): PurchaseState {
  return {
    id: PURCHASE_ID,
    payment_status: "pending",
    duration_days: 30,
    mercado_pago_payment_id: null,
    start_date: null,
    end_date: null,
  };
}

Deno.test("firma inválida es informativa: se procesa igual vía API y se audita signature_valid=false", async () => {
  // La firma de MP es inconsistente (IPN legacy, entornos prueba/prod), así que
  // NO se rechaza por firma. La barrera real es la consulta a la API de MP: el
  // pago existe (mock approved) y su external_reference corresponde a la compra.
  const admin = createFakeAdmin(pendingPurchase());
  const mp = createMpClient({ id: 1, status: "approved", external_reference: PURCHASE_ID });

  const res = await handleWebhook(makeRequest(paymentNotification), deps(admin, mp, alwaysInvalid));

  assertEquals(res.status, 200);
  // El pago se aplica (la API es la autoridad), aunque la firma no validó.
  assertEquals(admin.purchase?.payment_status, "approved");
  const applied = admin.events.find((e) => e.processing_result === "applied");
  assertExists(applied);
  // La auditoría registra que la firma NO validó.
  assertEquals(applied?.signature_valid, false);
});

Deno.test("non-payment event is ignored with 200", async () => {
  const admin = createFakeAdmin(pendingPurchase());
  const mp = createMpClient({ id: 1, status: "approved", external_reference: PURCHASE_ID });

  const res = await handleWebhook(
    makeRequest({ type: "plan", action: "created", data: { id: "MP-1" } }),
    deps(admin, mp),
  );

  assertEquals(res.status, 200);
  assertEquals(admin.purchase?.payment_status, "pending");
  assertEquals(admin.events[0].processing_result, "ignored_type");
});

Deno.test("unknown external_reference returns 200 without throwing", async () => {
  const admin = createFakeAdmin(null); // la compra no existe
  const mp = createMpClient({ id: 1, status: "approved", external_reference: "44444444-4444-4444-8444-444444444444" });

  const res = await handleWebhook(makeRequest(paymentNotification), deps(admin, mp));

  assertEquals(res.status, 200);
  assertEquals(admin.events[0].processing_result, "purchase_not_found");
});

Deno.test("approved payment moves the purchase to approved with dates", async () => {
  const admin = createFakeAdmin(pendingPurchase());
  const mp = createMpClient({ id: 555, status: "approved", external_reference: PURCHASE_ID });

  const res = await handleWebhook(makeRequest(paymentNotification), deps(admin, mp));

  assertEquals(res.status, 200);
  assertEquals(admin.purchase?.payment_status, "approved");
  assertEquals(admin.purchase?.mercado_pago_payment_id, "555");
  assertExists(admin.purchase?.start_date);
  assertExists(admin.purchase?.end_date);

  // end_date = start_date + duration_days (30 días naturales).
  const start = new Date(admin.purchase!.start_date as string);
  const end = new Date(admin.purchase!.end_date as string);
  const expected = new Date(start);
  expected.setUTCDate(expected.getUTCDate() + 30);
  assertEquals(end.toISOString(), expected.toISOString());
  assertEquals(admin.events[0].processing_result, "applied");
});

Deno.test("idempotency: a resent approved webhook does not move start_date", async () => {
  const admin = createFakeAdmin(pendingPurchase());
  const mp = createMpClient({ id: 555, status: "approved", external_reference: PURCHASE_ID });

  // Primer webhook: aprueba y fija start_date.
  await handleWebhook(makeRequest(paymentNotification), deps(admin, mp));
  const firstStart = admin.purchase?.start_date;
  const firstEnd = admin.purchase?.end_date;
  assertExists(firstStart);

  // Reenvío del mismo pago. mercado_pago_payment_id ya coincide y el estado ya
  // es approved: debe ignorarse como duplicado sin tocar fechas.
  const res = await handleWebhook(makeRequest(paymentNotification), deps(admin, mp));

  assertEquals(res.status, 200);
  assertEquals(admin.purchase?.start_date, firstStart, "start_date must not move on resend");
  assertEquals(admin.purchase?.end_date, firstEnd, "end_date must not move on resend");
  assertEquals(admin.events[1].processing_result, "duplicate_ignored");
});

Deno.test("idempotency: an approved purchase is not re-activated by a late approved with a different payment id", async () => {
  // Estado inicial: ya aprobada con un payment id y start_date estable.
  const stableStart = "2026-06-01T00:00:00.000Z";
  const admin = createFakeAdmin({
    id: PURCHASE_ID,
    payment_status: "approved",
    duration_days: 30,
    mercado_pago_payment_id: "OLD-PAYMENT",
    start_date: stableStart,
    end_date: "2026-07-01T00:00:00.000Z",
  });
  // Un webhook approved con distinto payment id: el UPDATE condicionado
  // (.neq payment_status approved) no encuentra filas → stale_ignored.
  const mp = createMpClient({ id: 999, status: "approved", external_reference: PURCHASE_ID });

  const res = await handleWebhook(makeRequest(paymentNotification), deps(admin, mp));

  assertEquals(res.status, 200);
  assertEquals(admin.purchase?.start_date, stableStart, "start_date must stay put");
  assertEquals(admin.purchase?.mercado_pago_payment_id, "OLD-PAYMENT");
  assertEquals(admin.events[0].processing_result, "stale_ignored");
});

Deno.test("rejected payment moves the purchase to rejected without touching dates", async () => {
  const admin = createFakeAdmin(pendingPurchase());
  const mp = createMpClient({ id: 777, status: "rejected", external_reference: PURCHASE_ID });

  const res = await handleWebhook(makeRequest(paymentNotification), deps(admin, mp));

  assertEquals(res.status, 200);
  assertEquals(admin.purchase?.payment_status, "rejected");
  assertEquals(admin.purchase?.mercado_pago_payment_id, "777");
  assertEquals(admin.purchase?.start_date, null);
  assertEquals(admin.purchase?.end_date, null);
  assertEquals(admin.events[0].processing_result, "applied");
});

Deno.test("a late pending webhook never degrades an already approved purchase", async () => {
  const admin = createFakeAdmin({
    id: PURCHASE_ID,
    payment_status: "approved",
    duration_days: 30,
    mercado_pago_payment_id: "PAID",
    start_date: "2026-06-01T00:00:00.000Z",
    end_date: "2026-07-01T00:00:00.000Z",
  });
  const mp = createMpClient({ id: 888, status: "pending", external_reference: PURCHASE_ID });

  const res = await handleWebhook(makeRequest(paymentNotification), deps(admin, mp));

  assertEquals(res.status, 200);
  assertEquals(admin.purchase?.payment_status, "approved");
  assertEquals(admin.events[0].processing_result, "stale_ignored");
});

Deno.test("getPayment 404 returns 200 (payment_not_found) without reprocessing", async () => {
  const admin = createFakeAdmin(pendingPurchase());
  const mp = createMpClient(new Error("Mercado Pago getPayment failed (404): not found"));

  const res = await handleWebhook(makeRequest(paymentNotification), deps(admin, mp));

  assertEquals(res.status, 200);
  assertEquals(admin.purchase?.payment_status, "pending");
  assertEquals(admin.events[0].processing_result, "payment_not_found");
});

Deno.test("getPayment non-404 error returns 500 so MP retries", async () => {
  const admin = createFakeAdmin(pendingPurchase());
  const mp = createMpClient(new Error("Mercado Pago getPayment failed (500): server error"));

  const res = await handleWebhook(makeRequest(paymentNotification), deps(admin, mp));

  assertEquals(res.status, 500);
  assertEquals(admin.purchase?.payment_status, "pending");
});

// Formato IPN clásico de Mercado Pago: topic + id en la query string y body
// vacío. Debe procesarse igual que una notificación de pago (regresión de H1).
function makeQueryRequest(): Request {
  return new Request(
    "https://sb.example.test/functions/v1/mercado-pago-webhook?topic=payment&id=MP-QS",
    {
      method: "POST",
      headers: {
        "x-signature": "ts=1,v1=deadbeef",
        "x-request-id": "req-qs",
      },
      body: "",
    },
  );
}

Deno.test("query-string (topic/IPN) notification is processed like a payment", async () => {
  const admin = createFakeAdmin(pendingPurchase());
  const mp = createMpClient({ id: 321, status: "approved", external_reference: PURCHASE_ID });

  const res = await handleWebhook(makeQueryRequest(), deps(admin, mp));

  assertEquals(res.status, 200);
  assertEquals(admin.purchase?.payment_status, "approved");
  assertEquals(admin.purchase?.mercado_pago_payment_id, "321");
  assertEquals(admin.events[0].processing_result, "applied");
});
