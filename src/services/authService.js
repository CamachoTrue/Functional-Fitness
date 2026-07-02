import { supabase } from './supabaseClient'

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

export async function getSession() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}

export async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone')
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
