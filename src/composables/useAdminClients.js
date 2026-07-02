import { ref } from 'vue'

import {
  fetchAllPurchases,
  fetchAllRoles,
  fetchClients,
} from '../services/adminService'

/**
 * Lista de clientes para el área de administración. Une, EN EL CLIENTE y por
 * user_id, cada perfil con su rol y con sus compras (no hay embedding
 * profiles↔purchases porque no existe FK directa). De las compras se derivan el
 * plan y el estado del cliente.
 *
 * Estado derivado por cliente:
 * - role: 'admin' | 'client' (por defecto 'client' si no hay fila de rol).
 * - purchasesCount: número total de compras del cliente.
 * - currentPlan: package_name de la compra approved vigente más reciente, o
 *   null si no tiene ninguna vigente.
 * - isActive: tiene al menos una compra approved VIGENTE (end_date > ahora, o
 *   end_date null en una compra approved).
 *
 * Sigue el patrón de usePackages: refs loading/error + load() idempotente;
 * errores en español; sin acceso directo a Supabase.
 */
export function useAdminClients() {
  const clients = ref([])
  const loading = ref(false)
  const error = ref(null)

  function isApprovedAndCurrent(purchase, now) {
    if (purchase.payment_status !== 'approved') return false
    if (!purchase.end_date) return true
    return new Date(purchase.end_date).getTime() > now
  }

  async function load() {
    loading.value = true
    error.value = null
    try {
      const now = Date.now()
      const [profiles, roles, purchases] = await Promise.all([
        fetchClients(),
        fetchAllRoles(),
        fetchAllPurchases(),
      ])

      // Índice de roles por user_id (admin gana sobre client si hubiera ambos).
      const roleByUser = new Map()
      roles.forEach((row) => {
        if (row.role === 'admin' || !roleByUser.has(row.user_id)) {
          roleByUser.set(row.user_id, row.role)
        }
      })

      // Agrupa compras por user_id (fetchAllPurchases ya viene ordenado por
      // created_at desc, así que el primer approved vigente es el más reciente).
      const purchasesByUser = new Map()
      purchases.forEach((purchase) => {
        const list = purchasesByUser.get(purchase.user_id) ?? []
        list.push(purchase)
        purchasesByUser.set(purchase.user_id, list)
      })

      clients.value = profiles.map((profile) => {
        const userPurchases = purchasesByUser.get(profile.id) ?? []
        const currentPurchase = userPurchases.find((purchase) =>
          isApprovedAndCurrent(purchase, now),
        )
        return {
          id: profile.id,
          full_name: profile.full_name,
          email: profile.email,
          phone: profile.phone,
          created_at: profile.created_at,
          role: roleByUser.get(profile.id) ?? 'client',
          purchasesCount: userPurchases.length,
          currentPlan: currentPurchase?.package_name ?? null,
          isActive: Boolean(currentPurchase),
        }
      })
    } catch {
      error.value = 'No pudimos cargar los clientes. Intenta de nuevo en unos minutos.'
      clients.value = []
    } finally {
      loading.value = false
    }
  }

  return { clients, loading, error, load }
}
