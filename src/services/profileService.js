import { supabase } from './supabaseClient'

/**
 * Service del perfil del cliente. Encapsula las mutaciones sobre public.profiles
 * (nombre, teléfono y avatar). Sigue el patrón de los demás services: importa
 * `supabase` de supabaseClient y lanza ante error. Los componentes/stores nunca
 * tocan supabase directo: usan estas funciones.
 */

/**
 * Actualiza el perfil del usuario. avatarPath es opcional: solo se escribe si se
 * pasa explícitamente (permite guardar nombre/teléfono sin tocar el avatar, y
 * también fijar avatarPath a null para borrar la foto). El grant de columnas del
 * cliente (full_name, phone, avatar_path) y las policies profiles_update_own_or_admin
 * garantizan que solo pueda modificar su propia fila y esas columnas. NO se escribe
 * updated_at: el cliente no tiene grant sobre esa columna (incluirla daría 42501) y
 * el trigger profiles_set_updated_at ya la mantiene automáticamente.
 * @param {{ userId: string, fullName?: string, phone?: string, avatarPath?: string|null }} params
 * @returns {Promise<object>} fila actualizada (id, full_name, email, phone, avatar_path)
 */
export async function updateMyProfile({ userId, fullName, phone, avatarPath }) {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      full_name: fullName,
      phone,
      ...(avatarPath !== undefined ? { avatar_path: avatarPath } : {}),
    })
    .eq('id', userId)
    .select('id, full_name, email, phone, avatar_path')
    .single()

  if (error) throw error
  return data
}
