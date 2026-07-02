import { computed, ref } from 'vue'

import { fetchMyPurchases } from '../services/paymentService'
import { fetchMyAssignedRoutine } from '../services/routineService'

/**
 * Estado del panel del cliente: resumen del plan, del cuestionario y de la
 * rutina. Sigue el patrón de los demás composables (refs loading/error/data +
 * load(), mensajes en español, sin acceso directo a Supabase: todo pasa por
 * services).
 *
 * Deriva del par (compras, rutina):
 * - El PLAN vigente: la compra approved cuya ventana [start_date, end_date] está
 *   activa (start_date <= ahora y end_date > ahora o null). Si hay varias, la más
 *   reciente. Refleja la misma condición que la RLS aplica a la rutina.
 * - El estado del CUESTIONARIO de esa compra: completado si la compra trae al
 *   menos un questionnaires embebido; pendiente en caso contrario.
 * - El estado de la RUTINA: "lista" si fetchMyAssignedRoutine expone una rutina
 *   (RLS: assigned + compra vigente); "en preparación" si devuelve null.
 */
export function useClientDashboard() {
  const purchases = ref([])
  const routine = ref(null)
  const loading = ref(false)
  const error = ref(null)

  /**
   * ¿La compra está approved y su ventana de vigencia sigue abierta? end_date
   * null se interpreta como vigencia indefinida; start_date null como ya
   * iniciada.
   */
  function isActiveApproved(purchase) {
    if (purchase?.payment_status !== 'approved') return false
    const now = Date.now()
    if (purchase.start_date && new Date(purchase.start_date).getTime() > now) return false
    if (purchase.end_date && new Date(purchase.end_date).getTime() <= now) return false
    return true
  }

  function hasQuestionnaire(purchase) {
    return Array.isArray(purchase?.questionnaires) && purchase.questionnaires.length > 0
  }

  // Compra approved y vigente más reciente (las compras llegan ordenadas por
  // created_at desc desde el service). null si el cliente aún no tiene un plan
  // activo.
  const activePurchase = computed(
    () => purchases.value.find((purchase) => isActiveApproved(purchase)) ?? null,
  )

  // Hay un plan vigente que mostrar.
  const hasActivePlan = computed(() => Boolean(activePurchase.value))

  // Estado del cuestionario del plan vigente: 'completed' | 'pending' | null (sin
  // plan). Deriva del embebido questionnaires de la compra, no de flags manuales.
  const questionnaireStatus = computed(() => {
    if (!activePurchase.value) return null
    return hasQuestionnaire(activePurchase.value) ? 'completed' : 'pending'
  })

  // Estado de la rutina: 'ready' si la RLS expone la rutina assigned vigente,
  // 'preparing' en caso contrario (aún en preparación / no accesible).
  const routineStatus = computed(() => (routine.value ? 'ready' : 'preparing'))

  async function load() {
    loading.value = true
    error.value = null
    purchases.value = []
    routine.value = null

    try {
      const [purchaseData, routineData] = await Promise.all([
        fetchMyPurchases(),
        fetchMyAssignedRoutine(),
      ])
      purchases.value = purchaseData
      routine.value = routineData
    } catch {
      error.value = 'No pudimos cargar tu panel. Intenta de nuevo en unos minutos.'
      purchases.value = []
      routine.value = null
    } finally {
      loading.value = false
    }
  }

  return {
    purchases,
    routine,
    loading,
    error,
    activePurchase,
    hasActivePlan,
    questionnaireStatus,
    routineStatus,
    load,
  }
}
