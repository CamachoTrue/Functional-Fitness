import { supabase } from './supabaseClient'

const PACKAGE_FIELDS =
  'id, name, description, price, currency, duration_days, includes, is_recommended'

// Campos para el área de administración: incluye is_active y timestamps, que el
// catálogo público no necesita. El admin puede leer inactivos vía la policy
// packages_admin_all.
const ADMIN_PACKAGE_FIELDS =
  'id, name, description, price, currency, duration_days, includes, is_recommended, is_active, created_at, updated_at'

/**
 * Devuelve el catalogo publico: solo paquetes activos. El rol anon esta limitado
 * por la policy packages_read_active (using is_active), por lo que este filtro
 * refleja tambien lo que la base permite ver. El orden es determinista: primero
 * el recomendado y luego por precio ascendente.
 */
export async function fetchActivePackages() {
  const { data, error } = await supabase
    .from('packages')
    .select(PACKAGE_FIELDS)
    .eq('is_active', true)
    .order('is_recommended', { ascending: false })
    .order('price', { ascending: true })

  if (error) throw error
  return data ?? []
}

/**
 * Devuelve un paquete activo por id, o null si no existe o esta inactivo.
 */
export async function fetchPackageById(id) {
  const { data, error } = await supabase
    .from('packages')
    .select(PACKAGE_FIELDS)
    .eq('id', id)
    .eq('is_active', true)
    .maybeSingle()

  if (error) throw error
  return data ?? null
}

/**
 * ADMIN: lista todos los paquetes (activos e inactivos). El admin ve inactivos
 * gracias a la policy packages_admin_all. Orden determinista: activos primero,
 * luego recomendados, luego por precio ascendente.
 * @returns {Promise<Array<object>>}
 */
export async function fetchAllPackages() {
  const { data, error } = await supabase
    .from('packages')
    .select(ADMIN_PACKAGE_FIELDS)
    .order('is_active', { ascending: false })
    .order('is_recommended', { ascending: false })
    .order('price', { ascending: true })

  if (error) throw error
  return data ?? []
}

/**
 * ADMIN: lee un paquete por id sin filtrar por is_active (para editar también
 * los inactivos). maybeSingle → null si no existe.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export async function fetchPackageByIdAdmin(id) {
  const { data, error } = await supabase
    .from('packages')
    .select(ADMIN_PACKAGE_FIELDS)
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return data ?? null
}

/**
 * ADMIN: crea un paquete. El payload debe respetar los CHECKs (price > 0,
 * currency ^[A-Z]{3}$, duration_days > 0). Devuelve la fila creada.
 * @param {object} payload
 * @returns {Promise<object>}
 */
export async function createPackage(payload) {
  const { data, error } = await supabase
    .from('packages')
    .insert(payload)
    .select(ADMIN_PACKAGE_FIELDS)
    .single()

  if (error) throw error
  return data
}

/**
 * ADMIN: actualiza un paquete por id. Devuelve la fila actualizada.
 * @param {string} id
 * @param {object} payload
 * @returns {Promise<object>}
 */
export async function updatePackage(id, payload) {
  const { data, error } = await supabase
    .from('packages')
    .update(payload)
    .eq('id', id)
    .select(ADMIN_PACKAGE_FIELDS)
    .single()

  if (error) throw error
  return data
}

/**
 * ADMIN: activa o desactiva un paquete (soft delete). Los paquetes NO se borran
 * en duro porque purchases los referencia (on delete restrict). Devuelve la
 * fila actualizada.
 * @param {string} id
 * @param {boolean} isActive
 * @returns {Promise<object>}
 */
export async function setPackageActive(id, isActive) {
  const { data, error } = await supabase
    .from('packages')
    .update({ is_active: isActive })
    .eq('id', id)
    .select(ADMIN_PACKAGE_FIELDS)
    .single()

  if (error) throw error
  return data
}
