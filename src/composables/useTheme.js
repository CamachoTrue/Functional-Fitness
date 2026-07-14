import { computed, readonly, ref } from 'vue'

/**
 * Estado global del tema (claro/oscuro). Singleton a nivel de módulo: todas las
 * instancias del toggle y del layout comparten el mismo `theme`.
 *
 * Reglas:
 *  - Si el usuario eligió manualmente, se respeta y persiste en localStorage.
 *  - Si no, la marca arranca en OSCURO por defecto (el toggle sigue disponible).
 * El `index.html` ya aplica la clase `.dark` antes de pintar (anti-FOUC); aquí
 * solo sincronizamos el estado reactivo.
 */

const STORAGE_KEY = 'theme'

function storedPreference() {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === 'dark' || value === 'light' ? value : null
  } catch {
    return null
  }
}

const isDark = ref(document.documentElement.classList.contains('dark'))
let initialized = false

function apply(dark) {
  isDark.value = dark
  document.documentElement.classList.toggle('dark', dark)
}

function initTheme() {
  if (initialized) return
  initialized = true

  // Alinea el estado reactivo con lo que ya aplicó el script anti-FOUC:
  // elección guardada del usuario, o OSCURO por defecto de la marca.
  apply(storedPreference() ? storedPreference() === 'dark' : true)
}

function setTheme(theme) {
  const dark = theme === 'dark'
  try {
    localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light')
  } catch {
    /* sin persistencia: al menos aplica en la sesión actual */
  }
  apply(dark)
}

function toggleTheme() {
  setTheme(isDark.value ? 'light' : 'dark')
}

export function useTheme() {
  return {
    isDark: readonly(isDark),
    theme: computed(() => (isDark.value ? 'dark' : 'light')),
    initTheme,
    setTheme,
    toggleTheme,
  }
}
