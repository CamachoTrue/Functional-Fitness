import { supabase } from './supabaseClient'

const PURCHASE_FIELDS =
  'id, package_name, amount, currency, payment_status, start_date, end_date, created_at'

/**
 * Crea una preferencia de pago en Mercado Pago a través de la Edge Function
 * create-payment-preference. El snapshot de la compra (nombre, importe, moneda,
 * duración) se genera en el backend con service role a partir de la tabla
 * packages: aquí solo viaja el package_id. Nunca se envía el importe desde el
 * cliente.
 *
 * Devuelve { initPoint, purchaseId }. Lanza si la función devuelve error.
 */
export async function createPaymentPreference(packageId) {
  const { data, error } = await supabase.functions.invoke('create-payment-preference', {
    body: { package_id: packageId },
  })

  if (error) throw error

  return {
    initPoint: data?.init_point ?? null,
    purchaseId: data?.purchase_id ?? null,
  }
}

/**
 * Lee una compra por id para las vistas de retorno de pago. Devuelve el estado
 * real desde la base (payment_status), nunca deducido de la URL de retorno. La
 * RLS limita la visibilidad al dueño de la compra; si no existe o no es visible
 * se devuelve null.
 */
export async function fetchPurchaseById(purchaseId) {
  const { data, error } = await supabase
    .from('purchases')
    .select(PURCHASE_FIELDS)
    .eq('id', purchaseId)
    .maybeSingle()

  if (error) throw error
  return data ?? null
}

/**
 * Lista las compras del usuario autenticado. La RLS ya filtra a las compras
 * cuyo dueño es el usuario, por lo que no hace falta un where explícito por
 * user_id. Se embebe questionnaires(purchase_id) para conocer, en una sola
 * consulta, si la compra ya tiene cuestionario. Orden: más recientes primero.
 * Lanza ante error.
 */
export async function fetchMyPurchases() {
  const { data, error } = await supabase
    .from('purchases')
    .select(
      'id, package_name, amount, currency, payment_status, start_date, end_date, created_at, questionnaires (purchase_id)',
    )
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}
