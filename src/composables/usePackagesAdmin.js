import { ref } from 'vue'

import {
  createPackage,
  fetchAllPackages,
  setPackageActive,
  updatePackage,
} from '../services/packagesService'

/**
 * Estado y operaciones de administración del catálogo de paquetes. Sigue el
 * patrón de useAdminClients (refs loading/error/data + load() idempotente) y
 * añade `saving` para las mutaciones. Toda lectura/escritura pasa por
 * packagesService; aquí solo se orquestan refs y mensajes en español.
 *
 * Los paquetes NO se borran en duro (los referencian purchases con on delete
 * restrict): solo se activan/desactivan con toggleActive.
 */

/**
 * Traduce el error crudo del service a un mensaje en español. Mapea las
 * violaciones de los CHECKs de la tabla packages a mensajes útiles; el resto
 * cae en un genérico.
 * @param {any} err
 * @returns {string}
 */
function mapPackageError(err) {
  const constraint = err?.constraint ?? ''
  const message = String(err?.message ?? '')

  if (constraint === 'packages_positive_price' || /packages_positive_price/.test(message)) {
    return 'El precio debe ser mayor que cero.'
  }
  if (constraint === 'packages_currency_format' || /packages_currency_format/.test(message)) {
    return 'La moneda debe ser un código de 3 letras mayúsculas (p. ej. MXN).'
  }
  if (
    constraint === 'packages_positive_duration' ||
    /packages_positive_duration/.test(message)
  ) {
    return 'La duración debe ser mayor que cero.'
  }
  if (constraint === 'packages_name_length' || /packages_name_length/.test(message)) {
    return 'El nombre debe tener entre 1 y 120 caracteres.'
  }
  return 'No pudimos guardar el paquete. Revisa los datos e intenta de nuevo.'
}

export function usePackagesAdmin() {
  const packages = ref([])
  const loading = ref(false)
  const error = ref(null)
  const saving = ref(false)

  async function load() {
    loading.value = true
    error.value = null
    try {
      packages.value = await fetchAllPackages()
    } catch {
      error.value = 'No pudimos cargar los paquetes. Intenta de nuevo en unos minutos.'
      packages.value = []
    } finally {
      loading.value = false
    }
  }

  /**
   * Crea un paquete y lo inserta al inicio de la lista local en éxito.
   * @param {object} payload
   * @returns {Promise<object>} la fila creada
   */
  async function create(payload) {
    saving.value = true
    error.value = null
    try {
      const created = await createPackage(payload)
      packages.value = [created, ...packages.value]
      return created
    } catch (err) {
      error.value = mapPackageError(err)
      throw err
    } finally {
      saving.value = false
    }
  }

  /**
   * Actualiza un paquete y refleja el cambio en la lista local.
   * @param {string} id
   * @param {object} payload
   * @returns {Promise<object>} la fila actualizada
   */
  async function update(id, payload) {
    saving.value = true
    error.value = null
    try {
      const updated = await updatePackage(id, payload)
      packages.value = packages.value.map((pkg) => (pkg.id === id ? updated : pkg))
      return updated
    } catch (err) {
      error.value = mapPackageError(err)
      throw err
    } finally {
      saving.value = false
    }
  }

  /**
   * Activa/desactiva un paquete (soft delete) y refleja el cambio localmente.
   * @param {string} id
   * @param {boolean} isActive
   * @returns {Promise<object>} la fila actualizada
   */
  async function toggleActive(id, isActive) {
    saving.value = true
    error.value = null
    try {
      const updated = await setPackageActive(id, isActive)
      packages.value = packages.value.map((pkg) => (pkg.id === id ? updated : pkg))
      return updated
    } catch (err) {
      error.value = isActive
        ? 'No pudimos activar el paquete. Intenta de nuevo.'
        : 'No pudimos desactivar el paquete. Intenta de nuevo.'
      throw err
    } finally {
      saving.value = false
    }
  }

  return {
    packages,
    loading,
    error,
    saving,
    load,
    create,
    update,
    toggleActive,
  }
}
