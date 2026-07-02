// Cliente de Mercado Pago como INTERFAZ inyectable.
// La lógica de negocio (Edge Functions) depende de MercadoPagoClient, nunca
// hace fetch directo a la API de MP. En tests se inyecta un doble sin
// credenciales reales; en producción se usa createHttpMercadoPagoClient.

const MP_API_BASE = "https://api.mercadopago.com";

export interface MercadoPagoPreferenceItem {
  title: string;
  quantity: number;
  unit_price: number;
  currency_id: string;
}

export interface CreatePreferenceInput {
  items: MercadoPagoPreferenceItem[];
  external_reference: string;
  payer?: {
    email?: string;
  };
  back_urls?: {
    success?: string;
    failure?: string;
    pending?: string;
  };
  auto_return?: "approved" | "all";
  notification_url?: string;
  metadata?: Record<string, unknown>;
}

export interface MercadoPagoPreference {
  id: string;
  init_point?: string;
  sandbox_init_point?: string;
}

export interface MercadoPagoPayment {
  id: number;
  status: string;
  status_detail?: string;
  external_reference?: string;
  transaction_amount?: number;
  currency_id?: string;
}

export interface MercadoPagoClient {
  createPreference(
    input: CreatePreferenceInput,
  ): Promise<MercadoPagoPreference>;
  getPayment(paymentId: string): Promise<MercadoPagoPayment>;
}

// Implementación real basada en fetch a la API de Mercado Pago.
export function createHttpMercadoPagoClient(
  accessToken: string,
): MercadoPagoClient {
  if (!accessToken) {
    throw new Error("Missing Mercado Pago access token");
  }

  const authHeaders = {
    "Authorization": `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  return {
    async createPreference(input) {
      // Idempotencia de la creación de preferencia: usamos el external_reference
      // (= purchase.id) como clave, de modo que un reintento de red no genere dos
      // preferencias para la misma compra.
      const headers = input.external_reference
        ? { ...authHeaders, "X-Idempotency-Key": String(input.external_reference) }
        : authHeaders;
      const response = await fetch(`${MP_API_BASE}/checkout/preferences`, {
        method: "POST",
        headers,
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const detail = await response.text();
        throw new Error(
          `Mercado Pago createPreference failed (${response.status}): ${detail}`,
        );
      }

      return await response.json() as MercadoPagoPreference;
    },

    async getPayment(paymentId) {
      const response = await fetch(
        `${MP_API_BASE}/v1/payments/${encodeURIComponent(paymentId)}`,
        {
          method: "GET",
          headers: authHeaders,
        },
      );

      if (!response.ok) {
        const detail = await response.text();
        throw new Error(
          `Mercado Pago getPayment failed (${response.status}): ${detail}`,
        );
      }

      return await response.json() as MercadoPagoPayment;
    },
  };
}
