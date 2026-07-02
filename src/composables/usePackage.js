import { ref } from 'vue'

import { fetchPackageById } from '../services/packagesService'

/**
 * Estado de un unico paquete por id. Devuelve pkg=null cuando el paquete no
 * existe o esta inactivo; la vista distingue ese caso del error de red.
 */
export function usePackage(id) {
  const pkg = ref(null)
  const loading = ref(false)
  const error = ref(null)

  async function load() {
    loading.value = true
    error.value = null
    try {
      pkg.value = await fetchPackageById(id)
    } catch {
      error.value = 'No pudimos cargar el paquete. Intenta de nuevo.'
      pkg.value = null
    } finally {
      loading.value = false
    }
  }

  return { pkg, loading, error, load }
}
