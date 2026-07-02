import { ref } from 'vue'

import { fetchActivePackages } from '../services/packagesService'

/**
 * Estado del catalogo publico de paquetes. Toda lectura pasa por el service;
 * este composable solo orquesta refs reactivos y mensajes para la UI.
 */
export function usePackages() {
  const packages = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function load() {
    loading.value = true
    error.value = null
    try {
      packages.value = await fetchActivePackages()
    } catch {
      error.value = 'No pudimos cargar los paquetes. Intenta de nuevo.'
      packages.value = []
    } finally {
      loading.value = false
    }
  }

  return { packages, loading, error, load }
}
