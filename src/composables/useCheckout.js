import { ref } from 'vue'

import { createPaymentPreference } from '../services/paymentService'

/**
 * Encapsula el arranque de una compra: crea la preferencia de pago y redirige
 * al init_point de Mercado Pago (navegación externa, fuera del router). Expone
 * estado de carga y un mensaje de error en español para la vista.
 */
export function useCheckout() {
  const purchasing = ref(false)
  const purchaseError = ref(null)

  async function startCheckout(packageId) {
    purchasing.value = true
    purchaseError.value = null
    try {
      const { initPoint } = await createPaymentPreference(packageId)
      if (!initPoint) {
        throw new Error('missing init_point')
      }
      // Redirección externa al checkout de Mercado Pago. No usar router.push:
      // init_point es una URL absoluta en el dominio de Mercado Pago.
      window.location.assign(initPoint)
    } catch {
      purchaseError.value =
        'No pudimos iniciar el pago. Intenta de nuevo en unos minutos.'
      purchasing.value = false
    }
    // En el camino feliz no se limpia purchasing: la página se descarga por la
    // redirección y el botón debe permanecer en estado de carga hasta entonces.
  }

  return { purchasing, purchaseError, startCheckout }
}
