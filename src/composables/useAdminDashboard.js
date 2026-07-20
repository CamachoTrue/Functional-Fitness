import { ref } from 'vue'

import {
  fetchActiveApprovedPurchases,
  fetchAllPurchases,
  fetchApprovedPurchasesThisMonth,
  fetchAssignedRoutines,
  fetchClients,
  fetchPendingPurchasesCount,
} from '../services/adminService'

/**
 * Estado del panel de administración (dashboard). Sigue el patrón de
 * usePackages/useQuestionnaire: refs loading/error + load(); toda lectura pasa
 * por adminService y los mensajes de error están en español.
 *
 * Todas las agregaciones que requieren "distinct" o suma se resuelven aquí, en
 * el cliente, a partir de lecturas simples del service.
 *
 * Métricas expuestas:
 * - totalPurchases: total histórico de compras.
 * - pendingPurchases: compras en estado 'pending'.
 * - approvedThisMonth: número de compras approved del mes en curso
 *   (por created_at).
 * - revenueThisMonth: suma de amount de las compras approved del mes.
 * - revenueCurrency: moneda predominante de esa suma (informativa).
 * - activeClients: usuarios distintos con al menos una compra approved vigente.
 * - pendingRoutines: compras approved sin routine 'assigned' enlazada.
 */
export function useAdminDashboard() {
  const metrics = ref({
    totalPurchases: 0,
    pendingPurchases: 0,
    approvedThisMonth: 0,
    revenueThisMonth: 0,
    revenueCurrency: 'MXN',
    activeClients: 0,
    pendingRoutines: 0,
  })
  const latestPurchases = ref([])
  const topPackages = ref([])
  // Compras aprobadas que todavía no tienen rutina asignada (accionable: el admin
  // arma la rutina desde aquí). Incluye el nombre del cliente.
  const pendingRoutinePurchases = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function load() {
    loading.value = true
    error.value = null
    try {
      const [
        allPurchases,
        pendingPurchases,
        approvedThisMonth,
        activePurchases,
        assignedRoutines,
        clients,
      ] = await Promise.all([
        fetchAllPurchases(),
        fetchPendingPurchasesCount(),
        fetchApprovedPurchasesThisMonth(),
        fetchActiveApprovedPurchases(),
        fetchAssignedRoutines(),
        fetchClients(),
      ])

      // Mapa user_id -> nombre para mostrar el cliente (no el UUID crudo).
      const clientsById = new Map(clients.map((c) => [c.id, c]))
      const clientName = (userId) => {
        const c = clientsById.get(userId)
        return c?.full_name || c?.email || 'Cliente'
      }

      // Ingreso del mes: suma en cliente de amount (approved del mes).
      const revenueThisMonth = approvedThisMonth.reduce(
        (sum, purchase) => sum + Number(purchase.amount ?? 0),
        0,
      )
      const revenueCurrency = approvedThisMonth[0]?.currency ?? 'MXN'

      // Clientes activos: user_id distintos con compra approved vigente.
      const activeClients = new Set(
        activePurchases.map((purchase) => purchase.user_id),
      ).size

      // Rutinas pendientes de asignar: compras approved cuyo id NO aparece entre
      // los purchase_id de rutinas 'assigned'.
      const assignedPurchaseIds = new Set(
        assignedRoutines
          .map((routine) => routine.purchase_id)
          .filter((id) => id !== null && id !== undefined),
      )
      const approvedPurchases = allPurchases.filter(
        (purchase) => purchase.payment_status === 'approved',
      )
      const pendingRoutineList = approvedPurchases.filter(
        (purchase) => !assignedPurchaseIds.has(purchase.id),
      )
      const pendingRoutines = pendingRoutineList.length
      pendingRoutinePurchases.value = pendingRoutineList.slice(0, 8).map((purchase) => ({
        id: purchase.id,
        userId: purchase.user_id,
        packageName: purchase.package_name,
        clientName: clientName(purchase.user_id),
        createdAt: purchase.created_at,
      }))

      // Paquetes más vendidos: agrupar approved por package_name en cliente.
      const countByPackage = new Map()
      approvedPurchases.forEach((purchase) => {
        const name = purchase.package_name ?? 'Sin nombre'
        countByPackage.set(name, (countByPackage.get(name) ?? 0) + 1)
      })
      topPackages.value = [...countByPackage.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)

      metrics.value = {
        totalPurchases: allPurchases.length,
        pendingPurchases,
        approvedThisMonth: approvedThisMonth.length,
        revenueThisMonth,
        revenueCurrency,
        activeClients,
        pendingRoutines,
      }

      latestPurchases.value = allPurchases.slice(0, 5).map((purchase) => ({
        ...purchase,
        clientName: clientName(purchase.user_id),
      }))
    } catch {
      error.value = 'No pudimos cargar el panel. Intenta de nuevo en unos minutos.'
      metrics.value = {
        totalPurchases: 0,
        pendingPurchases: 0,
        approvedThisMonth: 0,
        revenueThisMonth: 0,
        revenueCurrency: 'MXN',
        activeClients: 0,
        pendingRoutines: 0,
      }
      latestPurchases.value = []
      topPackages.value = []
      pendingRoutinePurchases.value = []
    } finally {
      loading.value = false
    }
  }

  return { metrics, latestPurchases, topPackages, pendingRoutinePurchases, loading, error, load }
}
