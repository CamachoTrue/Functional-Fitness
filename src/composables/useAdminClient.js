import { ref } from 'vue'

import {
  fetchClientById,
  fetchPurchasesByUser,
  fetchQuestionnairesByUser,
  fetchRolesByUser,
  fetchRoutinesByUser,
} from '../services/adminService'

/**
 * Detalle de un cliente para el área de administración. Todas las lecturas se
 * hacen por user_id (no hay embedding profiles↔purchases/questionnaires/
 * routines) y se unen EN EL CLIENTE.
 *
 * Expone:
 * - profile: perfil (o null si no existe / no es visible).
 * - role: 'admin' | 'client'.
 * - purchases: compras del cliente (más recientes primero).
 * - questionnaires: cuestionarios del cliente, indexables por purchase_id.
 * - routines: rutinas del cliente.
 * - pendingRoutinePurchases: compras approved SIN rutina 'assigned' enlazada
 *   (candidatas a "crear/asignar rutina").
 *
 * Patrón usePackages: loading/error + load(userId) idempotente; errores en
 * español; sin Supabase directo.
 */
export function useAdminClient() {
  const profile = ref(null)
  const role = ref('client')
  const purchases = ref([])
  const questionnaires = ref([])
  const routines = ref([])
  const pendingRoutinePurchases = ref([])
  const loading = ref(false)
  const error = ref(null)

  function reset() {
    profile.value = null
    role.value = 'client'
    purchases.value = []
    questionnaires.value = []
    routines.value = []
    pendingRoutinePurchases.value = []
  }

  async function load(userId) {
    loading.value = true
    error.value = null
    reset()
    try {
      const [profileData, roles, purchaseList, questionnaireList, routineList] =
        await Promise.all([
          fetchClientById(userId),
          fetchRolesByUser(userId),
          fetchPurchasesByUser(userId),
          fetchQuestionnairesByUser(userId),
          fetchRoutinesByUser(userId),
        ])

      profile.value = profileData
      role.value = roles.some((row) => row.role === 'admin') ? 'admin' : 'client'
      purchases.value = purchaseList
      questionnaires.value = questionnaireList
      routines.value = routineList

      // Compras approved sin rutina 'assigned' enlazada por purchase_id: son las
      // que quedan pendientes de asignar rutina.
      const assignedPurchaseIds = new Set(
        routineList
          .filter((routine) => routine.status === 'assigned')
          .map((routine) => routine.purchase_id)
          .filter((id) => id !== null && id !== undefined),
      )
      pendingRoutinePurchases.value = purchaseList.filter(
        (purchase) =>
          purchase.payment_status === 'approved' &&
          !assignedPurchaseIds.has(purchase.id),
      )
    } catch {
      error.value = 'No pudimos cargar el cliente. Intenta de nuevo en unos minutos.'
      reset()
    } finally {
      loading.value = false
    }
  }

  return {
    profile,
    role,
    purchases,
    questionnaires,
    routines,
    pendingRoutinePurchases,
    loading,
    error,
    load,
  }
}
