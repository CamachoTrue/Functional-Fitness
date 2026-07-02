// Tests de la lógica de negocio de create-payment-preference.
// Todo mockeado: un MercadoPagoClient falso y un doble del client supabase admin.
// No requiere MERCADO_PAGO_ACCESS_TOKEN ni red.
//
// Ejecutar: deno test --allow-env --allow-net --allow-read supabase/functions/

import { assertEquals } from "jsr:@std/assert@1";
import { handleCreatePreference } from "./index.ts";
import type { MercadoPagoClient } from "../_shared/mercadoPago.ts";

const VALID_PACKAGE_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "22222222-2222-4222-8222-222222222222";
const APP_URL = "https://app.example.test";
const NOTIFICATION_URL = "https://sb.example.test/functions/v1/mercado-pago-webhook";

// Doble mínimo del client supabase admin: implementa solo las cadenas usadas por
// la función (from().select().eq().maybeSingle(), from().insert().select().single(),
// from().update().eq()). Registra los inserts para poder inspeccionar el snapshot.
interface PackageRow {
  id: string;
  name: string;
  price: number;
  currency: string;
  duration_days: number;
  is_active: boolean;
}

interface FakeAdminOptions {
  pkg?: PackageRow | null;
  packageError?: { message: string } | null;
  insertError?: { message: string } | null;
  updateError?: { message: string } | null;
}

interface FakeAdmin {
  client: unknown;
  inserts: Record<string, unknown>[];
  updates: Record<string, unknown>[];
}

function createFakeAdmin(options: FakeAdminOptions = {}): FakeAdmin {
  const inserts: Record<string, unknown>[] = [];
  const updates: Record<string, unknown>[] = [];

  const client = {
    from(table: string) {
      if (table === "packages") {
        return {
          select() {
            return {
              eq() {
                return {
                  maybeSingle() {
                    return Promise.resolve({
                      data: options.pkg ?? null,
                      error: options.packageError ?? null,
                    });
                  },
                };
              },
            };
          },
        };
      }

      if (table === "purchases") {
        return {
          insert(row: Record<string, unknown>) {
            inserts.push(row);
            return {
              select() {
                return {
                  single() {
                    if (options.insertError) {
                      return Promise.resolve({
                        data: null,
                        error: options.insertError,
                      });
                    }
                    return Promise.resolve({
                      data: { id: "purchase-generated-id" },
                      error: null,
                    });
                  },
                };
              },
            };
          },
          update(row: Record<string, unknown>) {
            updates.push(row);
            return {
              eq() {
                return Promise.resolve({
                  data: null,
                  error: options.updateError ?? null,
                });
              },
            };
          },
        };
      }

      throw new Error(`unexpected table ${table}`);
    },
  };

  return { client, inserts, updates };
}

function createFakeMpClient(
  overrides: Partial<MercadoPagoClient> = {},
): { client: MercadoPagoClient; preferenceInputs: unknown[] } {
  const preferenceInputs: unknown[] = [];
  const client: MercadoPagoClient = {
    createPreference: (input) => {
      preferenceInputs.push(input);
      return Promise.resolve({
        id: "pref-123",
        init_point: "https://mp.example.test/checkout/pref-123",
      });
    },
    getPayment: () =>
      Promise.reject(new Error("getPayment should not be called here")),
    ...overrides,
  };
  return { client, preferenceInputs };
}

function makeRequest(body: unknown, withAuth = true): Request {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (withAuth) {
    headers["Authorization"] = "Bearer valid-token";
  }
  return new Request("https://sb.example.test/functions/v1/create-payment-preference", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

const activePackage: PackageRow = {
  id: VALID_PACKAGE_ID,
  name: "Plan Premium",
  price: 1499,
  currency: "MXN",
  duration_days: 60,
  is_active: true,
};

function baseDeps(admin: FakeAdmin, mp: MercadoPagoClient, user: { id: string } | null = { id: USER_ID }) {
  return {
    // deno-lint-ignore no-explicit-any
    supabaseAdmin: admin.client as any,
    mpClient: mp,
    appUrl: APP_URL,
    notificationUrl: NOTIFICATION_URL,
    getUserFromToken: () => Promise.resolve(user),
  };
}

Deno.test("non-POST method is rejected with 405", async () => {
  const admin = createFakeAdmin({ pkg: activePackage });
  const { client: mp } = createFakeMpClient();
  const req = new Request("https://sb.example.test/", { method: "GET" });

  const res = await handleCreatePreference(req, baseDeps(admin, mp));
  assertEquals(res.status, 405);
});

Deno.test("missing JWT returns 401 and creates no purchase", async () => {
  const admin = createFakeAdmin({ pkg: activePackage });
  const { client: mp } = createFakeMpClient();

  const res = await handleCreatePreference(
    makeRequest({ package_id: VALID_PACKAGE_ID }, false),
    baseDeps(admin, mp),
  );

  assertEquals(res.status, 401);
  assertEquals(admin.inserts.length, 0);
});

Deno.test("invalid token returns 401 and creates no purchase", async () => {
  const admin = createFakeAdmin({ pkg: activePackage });
  const { client: mp } = createFakeMpClient();

  const res = await handleCreatePreference(
    makeRequest({ package_id: VALID_PACKAGE_ID }),
    baseDeps(admin, mp, null),
  );

  assertEquals(res.status, 401);
  assertEquals(admin.inserts.length, 0);
});

Deno.test("invalid package_id returns 400 and creates no purchase", async () => {
  const admin = createFakeAdmin({ pkg: activePackage });
  const { client: mp } = createFakeMpClient();

  const res = await handleCreatePreference(
    makeRequest({ package_id: "not-a-uuid" }),
    baseDeps(admin, mp),
  );

  assertEquals(res.status, 400);
  assertEquals(admin.inserts.length, 0);
});

Deno.test("unknown package returns 404 and creates no purchase", async () => {
  const admin = createFakeAdmin({ pkg: null });
  const { client: mp } = createFakeMpClient();

  const res = await handleCreatePreference(
    makeRequest({ package_id: VALID_PACKAGE_ID }),
    baseDeps(admin, mp),
  );

  assertEquals(res.status, 404);
  assertEquals(admin.inserts.length, 0);
});

Deno.test("inactive package returns 409 and creates no purchase", async () => {
  const admin = createFakeAdmin({ pkg: { ...activePackage, is_active: false } });
  const { client: mp } = createFakeMpClient();

  const res = await handleCreatePreference(
    makeRequest({ package_id: VALID_PACKAGE_ID }),
    baseDeps(admin, mp),
  );

  assertEquals(res.status, 409);
  assertEquals(admin.inserts.length, 0);
});

Deno.test("a manipulated amount in the body is ignored: snapshot comes from the package", async () => {
  const admin = createFakeAdmin({ pkg: activePackage });
  const { client: mp } = createFakeMpClient();

  const res = await handleCreatePreference(
    // amount y currency manipulados en el body: deben ignorarse por completo.
    makeRequest({ package_id: VALID_PACKAGE_ID, amount: 1, currency: "USD" }),
    baseDeps(admin, mp),
  );

  assertEquals(res.status, 200);
  assertEquals(admin.inserts.length, 1);
  const inserted = admin.inserts[0];
  // El snapshot proviene 100% del paquete leído con service role.
  assertEquals(inserted.amount, activePackage.price);
  assertEquals(inserted.currency, activePackage.currency);
  assertEquals(inserted.package_name, activePackage.name);
  assertEquals(inserted.duration_days, activePackage.duration_days);
  assertEquals(inserted.payment_status, "pending");
  assertEquals(inserted.user_id, USER_ID);
  assertEquals(inserted.package_id, activePackage.id);
});

Deno.test("happy path: creates pending purchase and returns init_point + purchase_id", async () => {
  const admin = createFakeAdmin({ pkg: activePackage });
  const { client: mp, preferenceInputs } = createFakeMpClient();

  const res = await handleCreatePreference(
    makeRequest({ package_id: VALID_PACKAGE_ID }),
    baseDeps(admin, mp),
  );

  assertEquals(res.status, 200);
  assertEquals(res.body.init_point, "https://mp.example.test/checkout/pref-123");
  assertEquals(res.body.purchase_id, "purchase-generated-id");

  // La compra queda pending (nunca approved en esta función).
  assertEquals(admin.inserts[0].payment_status, "pending");

  // El preference_id se persiste en la compra.
  assertEquals(admin.updates.length, 1);
  assertEquals(admin.updates[0].mercado_pago_preference_id, "pref-123");

  // La preferencia usa el snapshot del paquete y el external_reference correcto.
  const prefInput = preferenceInputs[0] as {
    external_reference: string;
    items: { unit_price: number; currency_id: string; title: string }[];
    notification_url: string;
    back_urls: { success: string };
  };
  assertEquals(prefInput.external_reference, "purchase-generated-id");
  assertEquals(prefInput.items[0].unit_price, activePackage.price);
  assertEquals(prefInput.items[0].currency_id, activePackage.currency);
  assertEquals(prefInput.notification_url, NOTIFICATION_URL);
  assertEquals(prefInput.back_urls.success, `${APP_URL}/payment/success`);
});

Deno.test("mercado pago failure returns 502 (purchase left pending, not approved)", async () => {
  const admin = createFakeAdmin({ pkg: activePackage });
  const { client: mp } = createFakeMpClient({
    createPreference: () => Promise.reject(new Error("Mercado Pago createPreference failed (500): boom")),
  });

  const res = await handleCreatePreference(
    makeRequest({ package_id: VALID_PACKAGE_ID }),
    baseDeps(admin, mp),
  );

  assertEquals(res.status, 502);
  // La compra se creó pending pero nunca se aprueba aquí.
  assertEquals(admin.inserts[0].payment_status, "pending");
});
