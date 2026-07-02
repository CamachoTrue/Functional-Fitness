import { supabase } from './supabaseClient'

const QUESTIONNAIRE_FIELDS =
  'id, purchase_id, objective, age, weight, height, experience_level, injuries, medical_notes, equipment_available, training_place, days_per_week, time_per_session, preferred_schedule, limitations, additional_notes, created_at, updated_at'

/**
 * Lee el cuestionario de una compra por su purchase_id. La RLS limita la
 * visibilidad al dueño de la compra (o admin); si no existe o no es visible se
 * devuelve null. Lanza ante error de red/permisos.
 */
export async function fetchQuestionnaireByPurchaseId(purchaseId) {
  const { data, error } = await supabase
    .from('questionnaires')
    .select(QUESTIONNAIRE_FIELDS)
    .eq('purchase_id', purchaseId)
    .maybeSingle()

  if (error) throw error
  return data ?? null
}

/**
 * Crea o actualiza el cuestionario de una compra en una sola vía mediante upsert
 * con onConflict en purchase_id (unique). La RLS solo permite crear/editar el
 * cuestionario de una compra approved del propio usuario. Lanza ante error,
 * consistente con el resto de services.
 */
export async function saveQuestionnaire({ purchaseId, userId, values }) {
  const { data, error } = await supabase
    .from('questionnaires')
    .upsert(
      { user_id: userId, purchase_id: purchaseId, ...values },
      { onConflict: 'purchase_id' },
    )
    .select(QUESTIONNAIRE_FIELDS)
    .single()

  if (error) throw error
  return data
}
