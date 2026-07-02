import { ref } from 'vue'

import {
  fetchAllPurchases,
  fetchAllQuestionnaires,
  fetchClients,
} from '../services/adminService'

/**
 * Lista de cuestionarios para el área de administración, enriquecida con la
 * compra relacionada y los datos del cliente. Las uniones se hacen EN EL
 * CLIENTE: por purchase_id contra las compras (aquí SÍ hay FK real
 * questionnaires→purchases, pero se resuelve en cliente por coherencia con el
 * resto del área) y por user_id contra los perfiles (no hay embedding
 * profiles↔questionnaires).
 *
 * Cada fila expone las columnas del cuestionario más:
 * - client_name / client_email: datos del perfil (o null si no es visible).
 * - package_name: snapshot del paquete tomado de la compra relacionada.
 * - purchase_status: payment_status de la compra relacionada.
 *
 * Patrón usePackages: loading/error + load() idempotente; errores en español;
 * sin Supabase directo.
 */
export function useAdminQuestionnaires() {
  const questionnaires = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function load() {
    loading.value = true
    error.value = null
    try {
      const [questionnaireList, purchases, profiles] = await Promise.all([
        fetchAllQuestionnaires(),
        fetchAllPurchases(),
        fetchClients(),
      ])

      const purchaseById = new Map(
        purchases.map((purchase) => [purchase.id, purchase]),
      )
      const profileByUser = new Map(
        profiles.map((profile) => [profile.id, profile]),
      )

      questionnaires.value = questionnaireList.map((questionnaire) => {
        const purchase = purchaseById.get(questionnaire.purchase_id) ?? null
        const profile = profileByUser.get(questionnaire.user_id) ?? null
        return {
          ...questionnaire,
          client_name: profile?.full_name ?? null,
          client_email: profile?.email ?? null,
          package_name: purchase?.package_name ?? null,
          purchase_status: purchase?.payment_status ?? null,
        }
      })
    } catch {
      error.value =
        'No pudimos cargar los cuestionarios. Intenta de nuevo en unos minutos.'
      questionnaires.value = []
    } finally {
      loading.value = false
    }
  }

  return { questionnaires, loading, error, load }
}
