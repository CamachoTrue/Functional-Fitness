import { supabase } from './supabaseClient'

/**
 * Service de lecturas y agregaciones para el área de administración
 * (SOLO LECTURA en esta fase). Todas las funciones importan `supabase` de
 * supabaseClient, lanzan ante error de red/permisos y devuelven [] o null en
 * vacío, consistente con packagesService/paymentService/questionnaireService.
 *
 * ESTRATEGIA DE JOIN (decisión técnica del proyecto):
 * No existe FK directa entre `profiles` y `purchases`/`questionnaires`/
 * `routines`: todas esas tablas apuntan a `auth.users`. Por eso NO se usa el
 * embedding de PostgREST entre `profiles` y esas tablas. En su lugar se leen por
 * separado (fetchClients + fetchAllPurchases/fetchAllQuestionnaires/…) y la
 * unión por `user_id` se resuelve EN EL CLIENTE, dentro de los composables. Sí
 * es válido embeber donde hay FK real (p. ej. purchases.package_id → packages),
 * pero para el snapshot del paquete basta la columna `package_name` de
 * purchases, así que tampoco se embebe aquí.
 *
 * La RLS de admin (private.is_admin()) ya autoriza leer profiles/user_roles/
 * purchases/questionnaires/routines/exercises, por lo que estas consultas no
 * filtran por user_id salvo cuando se pide el detalle de un cliente concreto.
 *
 * CRITERIOS DE NEGOCIO usados por las agregaciones:
 * - "Venta": se cuenta por `created_at` de la compra (fecha en que se registró),
 *   no por start_date/end_date. Las métricas del mes usan created_at.
 * - "Cliente activo": usuario con al menos una compra approved VIGENTE, donde
 *   vigente = end_date > ahora, o bien end_date es null (compra approved sin
 *   caducidad registrada, se considera vigente).
 * - "Rutina pendiente de asignar": compra approved que aún NO tiene una routine
 *   en estado 'assigned' enlazada por purchase_id.
 */

const PURCHASE_FIELDS =
  'id, user_id, package_name, amount, currency, payment_status, mercado_pago_payment_id, start_date, end_date, created_at'

const QUESTIONNAIRE_FIELDS =
  'id, user_id, purchase_id, objective, experience_level, days_per_week, equipment_available, injuries, created_at'

/**
 * Lista todos los perfiles (clientes) ordenados del más reciente al más antiguo.
 * @returns {Promise<Array<{id:string, full_name:string|null, email:string|null, phone:string|null, created_at:string}>>}
 */
export async function fetchClients() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone, created_at')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

/**
 * Lista todas las filas de roles. Se unen por user_id en el cliente para saber
 * si un perfil es admin o client.
 * @returns {Promise<Array<{user_id:string, role:string}>>}
 */
export async function fetchAllRoles() {
  const { data, error } = await supabase
    .from('user_roles')
    .select('user_id, role')

  if (error) throw error
  return data ?? []
}

/**
 * Lista todas las compras (más recientes primero). Sin embedding de profiles:
 * el nombre/correo del cliente se une por user_id en el composable.
 * @returns {Promise<Array<object>>}
 */
export async function fetchAllPurchases() {
  const { data, error } = await supabase
    .from('purchases')
    .select(PURCHASE_FIELDS)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

/**
 * Lee un perfil por id (maybeSingle → null si no existe o no es visible).
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
export async function fetchClientById(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone, created_at')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  return data ?? null
}

/**
 * Compras de un usuario concreto (más recientes primero).
 * @param {string} userId
 * @returns {Promise<Array<object>>}
 */
export async function fetchPurchasesByUser(userId) {
  const { data, error } = await supabase
    .from('purchases')
    .select(PURCHASE_FIELDS)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

/**
 * Rol de un usuario concreto (por si se muestra en el detalle).
 * @param {string} userId
 * @returns {Promise<Array<{user_id:string, role:string}>>}
 */
export async function fetchRolesByUser(userId) {
  const { data, error } = await supabase
    .from('user_roles')
    .select('user_id, role')
    .eq('user_id', userId)

  if (error) throw error
  return data ?? []
}

/**
 * Lista todos los cuestionarios (más recientes primero). Se unen por user_id y
 * por purchase_id en el cliente.
 * @returns {Promise<Array<object>>}
 */
export async function fetchAllQuestionnaires() {
  const { data, error } = await supabase
    .from('questionnaires')
    .select(QUESTIONNAIRE_FIELDS)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

/**
 * Cuestionarios de un usuario concreto.
 * @param {string} userId
 * @returns {Promise<Array<object>>}
 */
export async function fetchQuestionnairesByUser(userId) {
  const { data, error } = await supabase
    .from('questionnaires')
    .select(QUESTIONNAIRE_FIELDS)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

/**
 * Rutinas de un usuario concreto. Incluye purchase_id para poder cruzar con las
 * compras approved y detectar rutinas pendientes de asignar.
 * @param {string} userId
 * @returns {Promise<Array<{id:string, name:string, status:string, purchase_id:string|null, assigned_at:string|null}>>}
 */
export async function fetchRoutinesByUser(userId) {
  const { data, error } = await supabase
    .from('routines')
    .select('id, name, status, purchase_id, assigned_at')
    .eq('user_id', userId)
    .order('assigned_at', { ascending: false, nullsFirst: false })

  if (error) throw error
  return data ?? []
}

/**
 * Lista todas las rutinas para el área de administración (más recientes
 * primero). Campos ligeros de cabecera; el detalle con días/ejercicios se lee
 * aparte con routineService.fetchRoutineWithContent. La RLS de admin autoriza
 * leer todas las rutinas. El nombre/correo del cliente se une por user_id en el
 * composable, igual que con purchases/questionnaires (no hay FK profiles↔routines).
 * @returns {Promise<Array<{id:string, user_id:string, purchase_id:string|null, name:string, status:string, assigned_at:string|null, created_at:string}>>}
 */
export async function fetchAllRoutines() {
  const { data, error } = await supabase
    .from('routines')
    .select('id, user_id, purchase_id, name, status, assigned_at, created_at')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

/**
 * Cuenta las compras en estado 'pending' (head + count exact, sin traer filas).
 * @returns {Promise<number>}
 */
export async function fetchPendingPurchasesCount() {
  const { count, error } = await supabase
    .from('purchases')
    .select('id', { count: 'exact', head: true })
    .eq('payment_status', 'pending')

  if (error) throw error
  return count ?? 0
}

/**
 * Devuelve el inicio del mes actual en ISO (UTC), usado como límite inferior de
 * created_at para las ventas del mes.
 * @param {Date} [now]
 * @returns {string}
 */
function startOfMonthISO(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
}

/**
 * Compras approved del mes en curso (created_at >= inicio de mes). Solo se
 * seleccionan amount/currency para sumar el ingreso EN EL CLIENTE; el conteo se
 * obtiene de la longitud del array. Se usa created_at como fecha de venta.
 * @param {Date} [now]
 * @returns {Promise<Array<{amount:number, currency:string}>>}
 */
export async function fetchApprovedPurchasesThisMonth(now = new Date()) {
  const { data, error } = await supabase
    .from('purchases')
    .select('amount, currency')
    .eq('payment_status', 'approved')
    .gte('created_at', startOfMonthISO(now))

  if (error) throw error
  return data ?? []
}

/**
 * Compras approved VIGENTES (end_date > ahora o end_date null). Devuelve solo
 * user_id/end_date; el número de clientes activos = cantidad de user_id
 * distintos, que se calcula EN EL CLIENTE (composable/dashboard).
 * @param {Date} [now]
 * @returns {Promise<Array<{user_id:string, end_date:string|null}>>}
 */
export async function fetchActiveApprovedPurchases(now = new Date()) {
  const { data, error } = await supabase
    .from('purchases')
    .select('user_id, end_date')
    .eq('payment_status', 'approved')
    .or(`end_date.gt.${now.toISOString()},end_date.is.null`)

  if (error) throw error
  return data ?? []
}

/**
 * Rutinas ya asignadas (status 'assigned') con purchase_id. Se cruzan con las
 * compras approved para saber qué compras YA tienen rutina; el resto son
 * "pendientes de asignar". La unión se resuelve EN EL CLIENTE.
 * @returns {Promise<Array<{purchase_id:string|null}>>}
 */
export async function fetchAssignedRoutines() {
  const { data, error } = await supabase
    .from('routines')
    .select('purchase_id')
    .eq('status', 'assigned')

  if (error) throw error
  return data ?? []
}
