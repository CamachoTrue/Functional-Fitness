import { createClient } from '@supabase/supabase-js'

import { supabase } from './supabaseClient'

/**
 * Crea un cliente de Supabase AISLADO para mutaciones de contraseña (updateUser).
 * El cliente principal usa un lock de auth (Web Locks) que, combinado con su
 * suscripción onAuthStateChange, provoca un deadlock conocido: updateUser()
 * adquiere el lock y nunca lo libera, dejando el cambio de contraseña colgado.
 * Un cliente efímero sin sesión persistida ni suscriptores evita el lock y
 * resuelve de inmediato (sin afectar la sesión del cliente principal).
 */
function createIsolatedAuthClient() {
  return createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        // storageKey propio: el lock de Web Locks se nombra a partir del storage
        // key, así que sin esto el cliente aislado compartiría el MISMO lock del
        // cliente principal y seguiría bloqueándose.
        storageKey: 'ff-auth-op',
        // Lock de paso: seguro aquí porque este cliente es efímero, de un solo
        // uso y sin concurrencia ni suscriptores (a diferencia del principal).
        lock: async (_name, _acquireTimeout, fn) => fn(),
      },
    },
  )
}

/**
 * Registra un usuario nuevo. El trigger handle_new_user() crea su profile y le
 * asigna el rol 'client'. El nombre viaja en user_metadata.full_name.
 */
export async function signUp({ email, password, fullName }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  })

  if (error) throw error
  return data
}

export async function signIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

/**
 * Envía el correo con el enlace para restablecer la contraseña. El enlace lleva
 * a `${origin}/reset-password`; Supabase incluye el token de recuperación y, al
 * abrirlo, dispara el evento PASSWORD_RECOVERY que crea una sesión temporal
 * (ver onAuthStateChange en authStore) desde la que se puede fijar la nueva
 * contraseña.
 */
export async function requestPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })
  if (error) throw error
}

/**
 * Actualiza la contraseña del usuario con sesión activa (flujo de recuperación).
 * Toma la sesión actual del cliente principal (establecida por el enlace del
 * correo) y ejecuta updateUser en un cliente aislado para evitar el deadlock del
 * lock de auth.
 */
export async function updatePassword(newPassword) {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) throw new Error('No hay sesión de recuperación activa')

  const client = createIsolatedAuthClient()
  const { error: setError } = await client.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  })
  if (setError) throw setError

  const { error } = await client.auth.updateUser({ password: newPassword })
  if (error) throw error
}

/**
 * Cambia la contraseña de un usuario autenticado verificando primero la actual.
 * Como Supabase no valida la contraseña vigente en updateUser, se reautentica con
 * signInWithPassword (falla con invalid_credentials si la actual es incorrecta) y
 * solo entonces se actualiza. Todo ocurre en un cliente aislado: así no dispara
 * el onAuthStateChange del cliente principal ni el deadlock del lock de auth, y
 * la sesión visible del usuario no se altera.
 */
export async function changePassword({ email, currentPassword, newPassword }) {
  const client = createIsolatedAuthClient()

  const { error: reauthError } = await client.auth.signInWithPassword({
    email,
    password: currentPassword,
  })
  if (reauthError) throw reauthError

  const { error } = await client.auth.updateUser({ password: newPassword })
  if (error) throw error
}

/**
 * Inicia el flujo de OAuth con Google. Redirige a Google y, al volver, Supabase
 * establece la sesión (detectSessionInUrl). Requiere que el proveedor Google esté
 * habilitado en Supabase Auth; si no lo está, la llamada falla con un error claro
 * y la UI lo muestra. El código queda listo para activarse en cuanto se configure.
 */
export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/` },
  })
  if (error) throw error
  return data
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}

/**
 * Reenvía el correo de verificación de la cuenta. Solo tiene efecto cuando la
 * confirmación por correo está activa en Supabase Auth (enable_confirmations);
 * si no lo está, las cuentas ya nacen verificadas y no hace falta.
 */
export async function resendVerificationEmail(email) {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: `${window.location.origin}/` },
  })
  if (error) throw error
}

export async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone, avatar_path')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  return data
}

/**
 * Devuelve los roles del usuario. Un admin conserva también su rol 'client',
 * por eso se leen todos y no uno solo.
 */
export async function fetchRoles(userId) {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)

  if (error) throw error
  return (data ?? []).map((row) => row.role)
}
