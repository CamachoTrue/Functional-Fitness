import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { supabase } from '../services/supabaseClient'
import {
  fetchProfile,
  fetchRoles,
  signIn,
  signOut,
  signUp,
} from '../services/authService'
import { createSignedAvatarUrl } from '../services/storageService'

export const useAuthStore = defineStore('auth', () => {
  const session = ref(null)
  const profile = ref(null)
  const roles = ref([])
  const avatarUrl = ref(null)
  const initialized = ref(false)
  const loading = ref(false)

  const user = computed(() => session.value?.user ?? null)
  const isAuthenticated = computed(() => Boolean(session.value))
  const isAdmin = computed(() => roles.value.includes('admin'))
  // Correo verificado. Con la confirmación por correo desactivada las cuentas
  // nacen verificadas (email_confirmed_at presente), así que esto es true; al
  // activarla en producción, refleja el estado real de verificación.
  const emailVerified = computed(() => Boolean(user.value?.email_confirmed_at))
  const displayName = computed(
    () => profile.value?.full_name || user.value?.email || 'Tu cuenta',
  )
  const homeRoute = computed(() =>
    isAdmin.value ? '/admin/dashboard' : '/cliente/panel',
  )

  /**
   * Resuelve la URL firmada del avatar a partir del profile cargado. Degrada
   * ante fallos (un error al firmar deja avatarUrl en null, sin propagar): el
   * avatar es decorativo y nunca debe abortar el arranque.
   */
  async function resolveAvatarUrl() {
    const path = profile.value?.avatar_path
    if (!path) {
      avatarUrl.value = null
      return
    }
    try {
      avatarUrl.value = await createSignedAvatarUrl(path)
    } catch {
      avatarUrl.value = null
    }
  }

  async function loadUserData() {
    if (!user.value) {
      profile.value = null
      roles.value = []
      avatarUrl.value = null
      return
    }

    const [profileData, roleData] = await Promise.all([
      fetchProfile(user.value.id),
      fetchRoles(user.value.id),
    ])
    profile.value = profileData
    roles.value = roleData
    await resolveAvatarUrl()
  }

  /**
   * Carga profile/roles degradando ante fallos de red/RLS: un error al leer los
   * datos no debe abortar el arranque ni disfrazarse de fallo de autenticación.
   */
  async function loadUserDataSafe() {
    try {
      await loadUserData()
    } catch {
      profile.value = null
      roles.value = []
      avatarUrl.value = null
    }
  }

  /**
   * Recarga el perfil (nombre/teléfono/avatar_path) y recalcula la URL firmada
   * del avatar. Se usa tras editar el perfil o cambiar la foto. Degrada igual
   * que loadUserData: un fallo al firmar deja avatarUrl en null sin romper nada.
   */
  async function refreshProfile() {
    if (!user.value) return
    profile.value = await fetchProfile(user.value.id)
    await resolveAvatarUrl()
  }

  /**
   * Recupera la sesión persistida al cargar la app y se suscribe a cambios de
   * autenticación. loadUserData() se difiere dentro del callback para evitar el
   * deadlock conocido al llamar a Supabase dentro de onAuthStateChange.
   */
  async function initialize() {
    if (initialized.value) return

    try {
      const { data } = await supabase.auth.getSession()
      session.value = data.session
      await loadUserDataSafe()
    } finally {
      supabase.auth.onAuthStateChange((_event, nextSession) => {
        session.value = nextSession
        setTimeout(() => {
          loadUserDataSafe()
        }, 0)
      })

      initialized.value = true
    }
  }

  async function register({ email, password, fullName }) {
    loading.value = true
    try {
      const data = await signUp({ email, password, fullName })
      session.value = data.session
      await loadUserDataSafe()
      return data
    } finally {
      loading.value = false
    }
  }

  async function login({ email, password }) {
    loading.value = true
    try {
      const data = await signIn({ email, password })
      session.value = data.session
      await loadUserDataSafe()
      return data
    } finally {
      loading.value = false
    }
  }

  /**
   * Cierra la sesión de forma tolerante: aunque signOut() falle (p. ej. un error
   * de red), el estado local se limpia en el finally para no dejar al usuario en
   * un estado aparentemente autenticado.
   */
  async function logout() {
    try {
      await signOut()
    } finally {
      session.value = null
      await loadUserDataSafe()
    }
  }

  return {
    session,
    profile,
    roles,
    avatarUrl,
    initialized,
    loading,
    user,
    isAuthenticated,
    isAdmin,
    emailVerified,
    displayName,
    homeRoute,
    initialize,
    register,
    login,
    logout,
    loadUserData,
    refreshProfile,
  }
})
