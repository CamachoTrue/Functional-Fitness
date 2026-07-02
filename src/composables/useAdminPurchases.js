import { ref } from 'vue'

import { fetchAllPurchases, fetchClients } from '../services/adminService'

/**
 * Lista de compras para el área de administración, enriquecida con el nombre y
 * correo del cliente. La unión se hace EN EL CLIENTE por user_id (no hay
 * embedding profiles↔purchases porque no existe FK directa entre ambas: las dos
 * apuntan a auth.users).
 *
 * Cada fila expone las columnas de la compra más:
 * - client_name: full_name del perfil, o null si el perfil no es visible.
 * - client_email: email del perfil, o null.
 *
 * Patrón usePackages: loading/error + load() idempotente; errores en español;
 * sin Supabase directo.
 */
export function useAdminPurchases() {
  const purchases = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function load() {
    loading.value = true
    error.value = null
    try {
      const [purchaseList, profiles] = await Promise.all([
        fetchAllPurchases(),
        fetchClients(),
      ])

      const profileByUser = new Map(
        profiles.map((profile) => [profile.id, profile]),
      )

      purchases.value = purchaseList.map((purchase) => {
        const profile = profileByUser.get(purchase.user_id) ?? null
        return {
          ...purchase,
          client_name: profile?.full_name ?? null,
          client_email: profile?.email ?? null,
        }
      })
    } catch {
      error.value = 'No pudimos cargar las compras. Intenta de nuevo en unos minutos.'
      purchases.value = []
    } finally {
      loading.value = false
    }
  }

  return { purchases, loading, error, load }
}
