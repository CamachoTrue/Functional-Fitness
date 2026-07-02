import { computed, reactive, ref } from 'vue'

import { fetchPurchaseById } from '../services/paymentService'
import {
  fetchQuestionnaireByPurchaseId,
  saveQuestionnaire,
} from '../services/questionnaireService'

/**
 * Valores por defecto del formulario: todos strings vacíos (incluido el enum
 * experience_level) para que se puedan enlazar directamente a los inputs y
 * selects. La normalización a número/null se hace al enviar.
 */
function emptyForm() {
  return {
    objective: '',
    age: '',
    weight: '',
    height: '',
    experience_level: '',
    injuries: '',
    medical_notes: '',
    equipment_available: '',
    training_place: '',
    days_per_week: '',
    time_per_session: '',
    preferred_schedule: '',
    limitations: '',
    additional_notes: '',
  }
}

const EXPERIENCE_LEVELS = ['basic', 'intermediate', 'advanced']

/**
 * Convierte un valor de base (número o null) a string para el formulario.
 */
function toFieldString(value) {
  return value === null || value === undefined ? '' : String(value)
}

/**
 * Normaliza un campo numérico: '' o valor no numérico → null; en caso contrario
 * el número. Evita violar los CHECK enviando cadenas vacías.
 */
function toNumberOrNull(value) {
  if (value === '' || value === null || value === undefined) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function toTextOrNull(value) {
  const trimmed = typeof value === 'string' ? value.trim() : value
  return trimmed === '' || trimmed === null || trimmed === undefined ? null : trimmed
}

/**
 * Estado y lógica del cuestionario de una compra. Sigue el patrón de
 * usePackage/useCheckout: try/catch, mensajes en español, sin acceso directo a
 * Supabase (todo pasa por services).
 */
export function useQuestionnaire() {
  const purchase = ref(null)
  const questionnaire = ref(null)
  const loading = ref(false)
  const saving = ref(false)
  const error = ref(null)
  const saveError = ref(null)
  const saved = ref(false)

  const form = reactive(emptyForm())
  const errors = reactive({})

  // Estado derivado del propio cuestionario, no de flags manuales: PENDIENTE si
  // aún no existe, COMPLETADO si ya se guardó.
  const isCompleted = computed(() => Boolean(questionnaire.value))

  // Solo las compras approved admiten cuestionario (refleja la barrera RLS).
  const isApproved = computed(() => purchase.value?.payment_status === 'approved')

  function hydrateForm(data) {
    form.objective = data.objective ?? ''
    form.age = toFieldString(data.age)
    form.weight = toFieldString(data.weight)
    form.height = toFieldString(data.height)
    form.experience_level = data.experience_level ?? ''
    form.injuries = data.injuries ?? ''
    form.medical_notes = data.medical_notes ?? ''
    form.equipment_available = data.equipment_available ?? ''
    form.training_place = data.training_place ?? ''
    form.days_per_week = toFieldString(data.days_per_week)
    form.time_per_session = toFieldString(data.time_per_session)
    form.preferred_schedule = data.preferred_schedule ?? ''
    form.limitations = data.limitations ?? ''
    form.additional_notes = data.additional_notes ?? ''
  }

  async function load(purchaseId) {
    loading.value = true
    error.value = null
    saveError.value = null
    saved.value = false
    purchase.value = null
    questionnaire.value = null

    try {
      const [purchaseData, questionnaireData] = await Promise.all([
        fetchPurchaseById(purchaseId),
        fetchQuestionnaireByPurchaseId(purchaseId),
      ])
      purchase.value = purchaseData
      questionnaire.value = questionnaireData
      if (questionnaireData) {
        hydrateForm(questionnaireData)
      }
    } catch {
      // Error de red/permisos: distinto de "compra no visible" (que devuelve
      // null sin lanzar) o "compra no approved" (purchase existe pero no lo es).
      error.value = 'No pudimos cargar tu cuestionario. Intenta de nuevo en unos minutos.'
      purchase.value = null
      questionnaire.value = null
    } finally {
      loading.value = false
    }
  }

  /**
   * Valida los campos reflejando los CHECK de la tabla con mensajes en español.
   * Devuelve true si no hay errores. Los campos son opcionales (la tabla los
   * permite null), pero si se rellenan deben respetar los rangos.
   */
  function validate() {
    Object.keys(errors).forEach((key) => delete errors[key])

    if (form.age !== '') {
      const age = Number(form.age)
      if (!Number.isFinite(age) || age < 13 || age > 100) {
        errors.age = 'La edad debe estar entre 13 y 100 años.'
      }
    }

    if (form.weight !== '') {
      const weight = Number(form.weight)
      if (!Number.isFinite(weight) || weight <= 0) {
        errors.weight = 'El peso debe ser mayor que 0.'
      }
    }

    if (form.height !== '') {
      const height = Number(form.height)
      if (!Number.isFinite(height) || height <= 0) {
        errors.height = 'La altura debe ser mayor que 0.'
      }
    }

    if (form.days_per_week !== '') {
      const days = Number(form.days_per_week)
      if (!Number.isFinite(days) || days < 1 || days > 7) {
        errors.days_per_week = 'Los días por semana deben estar entre 1 y 7.'
      }
    }

    if (form.time_per_session !== '') {
      const time = Number(form.time_per_session)
      if (!Number.isFinite(time) || time < 10 || time > 360) {
        errors.time_per_session = 'El tiempo por sesión debe estar entre 10 y 360 minutos.'
      }
    }

    if (form.experience_level !== '' && !EXPERIENCE_LEVELS.includes(form.experience_level)) {
      errors.experience_level = 'Selecciona un nivel de experiencia válido.'
    }

    return Object.keys(errors).length === 0
  }

  /**
   * Normaliza el formulario a valores aptos para la base: números para los
   * campos numéricos ('' → null), null para textos vacíos y enum vacío.
   */
  function normalize() {
    return {
      objective: toTextOrNull(form.objective),
      age: toNumberOrNull(form.age),
      weight: toNumberOrNull(form.weight),
      height: toNumberOrNull(form.height),
      experience_level: form.experience_level === '' ? null : form.experience_level,
      injuries: toTextOrNull(form.injuries),
      medical_notes: toTextOrNull(form.medical_notes),
      equipment_available: toTextOrNull(form.equipment_available),
      training_place: toTextOrNull(form.training_place),
      days_per_week: toNumberOrNull(form.days_per_week),
      time_per_session: toNumberOrNull(form.time_per_session),
      preferred_schedule: toTextOrNull(form.preferred_schedule),
      limitations: toTextOrNull(form.limitations),
      additional_notes: toTextOrNull(form.additional_notes),
    }
  }

  async function submit(userId) {
    saveError.value = null
    saved.value = false

    if (!validate()) return false

    saving.value = true
    try {
      const values = normalize()
      const data = await saveQuestionnaire({
        purchaseId: purchase.value.id,
        userId,
        values,
      })
      questionnaire.value = data
      hydrateForm(data)
      saved.value = true
      return true
    } catch {
      saveError.value = 'No pudimos guardar tu cuestionario. Intenta de nuevo en unos minutos.'
      return false
    } finally {
      saving.value = false
    }
  }

  return {
    purchase,
    questionnaire,
    loading,
    saving,
    error,
    saveError,
    saved,
    form,
    errors,
    isCompleted,
    isApproved,
    load,
    validate,
    submit,
  }
}
