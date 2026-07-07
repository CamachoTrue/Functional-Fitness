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

  // MÉTRICAS DERIVADAS (honestas). Solo se calcula lo que sale directamente de
  // las compras y de la rutina ya cargadas. Racha, sesiones completadas y
  // adherencia (%) NO se calculan aquí a propósito: dependen de un registro de
  // entrenamientos que aún no existe (llega en la Fase D). Fabricarlas mostraría
  // datos falsos, así que se omiten hasta tener esa fuente real.

  // Días que faltan hasta el vencimiento del plan vigente. null si el plan no
  // vence (end_date null) o no hay plan. Nunca negativo: la compra vigente por
  // definición aún no ha vencido, pero se acota por seguridad.
  const daysRemaining = computed(() => {
    const end = activePurchase.value?.end_date
    if (!end) return null
    const diffMs = new Date(end).getTime() - Date.now()
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
  })

  // Número de días de entrenamiento de la rutina lista. 0 si aún no hay rutina.
  const trainingDaysCount = computed(() => {
    if (routineStatus.value !== 'ready') return 0
    return routine.value?.routine_days?.length ?? 0
  })

  // "Tu sesión de hoy": heurística DOCUMENTADA. Como todavía no hay registro de
  // entrenamientos ni calendario asignado, no sabemos qué día "toca" realmente,
  // así que rotamos por la rutina de forma estable dentro de la semana: se
  // ordenan los días por day_number y se elige el índice
  // (new Date().getDay()) % totalDias — getDay() es 0=domingo..6=sábado. Es un
  // puntero de conveniencia hacia un día REAL de la rutina, no una sesión
  // planificada. Devuelve null si no hay rutina lista o no tiene días.
  const todaySession = computed(() => {
    if (routineStatus.value !== 'ready') return null
    const days = (routine.value?.routine_days ?? [])
      .slice()
      .sort((a, b) => a.day_number - b.day_number)
    if (days.length === 0) return null
    const day = days[new Date().getDay() % days.length]
    return {
      title: day.title,
      dayNumber: day.day_number,
      exerciseCount: day.routine_exercises?.length ?? 0,
    }
  })

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
    daysRemaining,
    trainingDaysCount,
    todaySession,
    load,
  }
}
