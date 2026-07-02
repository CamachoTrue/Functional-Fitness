import { supabase } from './supabaseClient'

/**
 * Service del constructor de rutinas (área admin). Sigue el patrón de
 * exercisesService/adminService: importa `supabase` de supabaseClient, lanza
 * ante error de red/permisos y devuelve la fila / [] / null en vacío. La
 * escritura está gobernada por la RLS de admin (private.is_admin()); NUNCA se
 * importa supabaseClient desde componentes/vistas.
 *
 * Los ids los genera el cliente (crypto.randomUUID) en los composables, igual
 * que en useExercisesAdmin, para que fila y objeto compartan identidad antes de
 * confirmarse la escritura.
 *
 * REGLAS DE DOMINIO relevantes (ver migraciones 000100/000200):
 * - routines.status ∈ draft/assigned/archived. CHECK routines_assigned_purchase:
 *   status='assigned' ⇒ purchase_id not null. El TRIGGER
 *   validate_assigned_routine EXIGE además que exista una compra 'approved' del
 *   mismo user_id al pasar a 'assigned'; si no, lanza `raise exception` con el
 *   texto 'approved purchase' (SIN code estándar). Aquí se detecta por
 *   error.message y se relanza tipado .code='no_approved_purchase'. El trigger
 *   también fija assigned_at automáticamente (coalesce(assigned_at, now())), por
 *   lo que no se envía desde el cliente.
 * - routines_purchase_id_key: índice UNIQUE parcial (una rutina por purchase).
 *   Crear una 2ª rutina para la misma compra lanza 23505 → assignRoutine lo
 *   traduce a .code='routine_exists' para que la UI edite la existente
 *   (fetchRoutineByPurchaseId).
 * - unique(routine_id, day_number) y unique(routine_day_id, order_index) + CHECK
 *   order_index>=0 / day_number>0. Al reordenar se usa un two-pass con OFFSET
 *   ALTO (+1000) — NUNCA negativos: Fase 1 sube los índices a un rango temporal
 *   alto libre de colisiones; Fase 2 los baja a su valor final contiguo. Tras
 *   reordenar la UI recarga desde DB (fetchRoutineWithContent).
 */

const REORDER_OFFSET = 1000

// Rutina "cabecera" (sin contenido embebido).
const ROUTINE_FIELDS =
  'id, user_id, purchase_id, name, objective, general_notes, status, assigned_at, created_at, updated_at'

// Selección embebida completa: rutina + días + ejercicios + datos del ejercicio.
const ROUTINE_WITH_CONTENT_FIELDS = `
  ${ROUTINE_FIELDS},
  routine_days (
    id, routine_id, day_number, title, notes, created_at, updated_at,
    routine_exercises (
      id, routine_day_id, exercise_id, order_index, sets, reps, rest_seconds, tempo, notes,
      exercises ( id, name, video_path, muscle_group, level )
    )
  )
`

// Selección embebida para la LECTURA DEL CLIENTE. A diferencia del select de
// admin, incluye description y common_mistakes del ejercicio (la ficha que ve el
// cliente al reproducir/consultar) y omite campos internos de auditoría.
const MY_ROUTINE_FIELDS = `
  id, name, objective, general_notes, status, assigned_at,
  routine_days (
    id, day_number, title, notes,
    routine_exercises (
      id, exercise_id, order_index, sets, reps, rest_seconds, tempo, notes,
      exercises ( id, name, video_path, muscle_group, level, description, common_mistakes )
    )
  )
`

/**
 * Lee la rutina ASIGNADA del cliente autenticado con su contenido embebido
 * (días → ejercicios → datos del ejercicio). NO filtra por user_id de forma
 * explícita: las políticas RLS (20260618000300 + 20260618000500) ya limitan la
 * visibilidad a la rutina 'assigned' del propio usuario cuya compra asociada
 * sigue aprobada y NO vencida (end_date > now o null). Si la RLS no expone
 * ninguna rutina (aún en preparación, compra vencida o no aprobada) devuelve
 * null → la UI muestra "en preparación"/vacío sin fuga de información.
 *
 * Solo hay una rutina por compra vigente, pero por robustez se ordena por
 * assigned_at desc y se toma la primera. Los días se ordenan por day_number y
 * los ejercicios de cada día por order_index EN EL CLIENTE (PostgREST no ordena
 * de forma fiable tablas embebidas anidadas a dos niveles).
 * @returns {Promise<object|null>}
 */
export async function fetchMyAssignedRoutine() {
  const { data, error } = await supabase
    .from('routines')
    .select(MY_ROUTINE_FIELDS)
    .eq('status', 'assigned')
    .order('assigned_at', { ascending: false })

  if (error) throw error

  const routine = (data ?? [])[0]
  if (!routine) return null

  const days = (routine.routine_days ?? [])
    .slice()
    .sort((a, b) => a.day_number - b.day_number)
    .map((day) => ({
      ...day,
      routine_exercises: (day.routine_exercises ?? [])
        .slice()
        .sort((a, b) => a.order_index - b.order_index),
    }))

  return { ...routine, routine_days: days }
}

/**
 * Lee una rutina con todo su contenido embebido (días y ejercicios). Los días
 * llegan ordenados por day_number; los ejercicios de cada día se ordenan por
 * order_index EN EL CLIENTE (PostgREST no ordena tablas embebidas anidadas a dos
 * niveles de forma fiable, así que se garantiza aquí).
 * @param {string} routineId
 * @returns {Promise<object|null>}
 */
export async function fetchRoutineWithContent(routineId) {
  const { data, error } = await supabase
    .from('routines')
    .select(ROUTINE_WITH_CONTENT_FIELDS)
    .eq('id', routineId)
    .order('day_number', { foreignTable: 'routine_days', ascending: true })
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const days = (data.routine_days ?? [])
    .slice()
    .sort((a, b) => a.day_number - b.day_number)
    .map((day) => ({
      ...day,
      routine_exercises: (day.routine_exercises ?? [])
        .slice()
        .sort((a, b) => a.order_index - b.order_index),
    }))

  return { ...data, routine_days: days }
}

/**
 * Lee la (única) rutina asociada a una compra. Respeta la unicidad
 * routines_purchase_id_key: maybeSingle → null si esa compra aún no tiene
 * rutina. Se usa para decidir entre crear una rutina nueva o editar la
 * existente al pulsar "Crear/asignar rutina".
 * @param {string} purchaseId
 * @returns {Promise<object|null>}
 */
export async function fetchRoutineByPurchaseId(purchaseId) {
  const { data, error } = await supabase
    .from('routines')
    .select(ROUTINE_FIELDS)
    .eq('purchase_id', purchaseId)
    .maybeSingle()

  if (error) throw error
  return data ?? null
}

/**
 * Crea una rutina en estado 'draft'. El id lo genera el cliente. purchaseId es
 * opcional (una rutina puede empezar sin compra ligada), pero si se pasa queda
 * sujeta a routines_purchase_id_key. Devuelve la fila creada.
 * @param {{id:string, userId:string, purchaseId?:string|null, name:string, objective?:string|null, generalNotes?:string|null}} input
 * @returns {Promise<object>}
 */
export async function createRoutine({
  id,
  userId,
  purchaseId = null,
  name,
  objective = null,
  generalNotes = null,
}) {
  const { data, error } = await supabase
    .from('routines')
    .insert({
      id,
      user_id: userId,
      purchase_id: purchaseId,
      name,
      objective,
      general_notes: generalNotes,
      status: 'draft',
    })
    .select(ROUTINE_FIELDS)
    .single()

  if (error) throw error
  return data
}

/**
 * Actualiza los campos de cabecera de una rutina (name/objective/general_notes/
 * purchase_id). Devuelve la fila actualizada.
 * @param {string} id
 * @param {object} fields
 * @returns {Promise<object>}
 */
export async function updateRoutine(id, fields) {
  const { data, error } = await supabase
    .from('routines')
    .update(fields)
    .eq('id', id)
    .select(ROUTINE_FIELDS)
    .single()

  if (error) throw error
  return data
}

const DAY_FIELDS = 'id, routine_id, day_number, title, notes, created_at, updated_at'

/**
 * Crea un día de rutina. El id lo genera el cliente. dayNumber debe ser > 0 y
 * único dentro de la rutina (routine_days_routine_number_key).
 * @param {{id:string, routineId:string, dayNumber:number, title:string, notes?:string|null}} input
 * @returns {Promise<object>}
 */
export async function createDay({ id, routineId, dayNumber, title, notes = null }) {
  const { data, error } = await supabase
    .from('routine_days')
    .insert({
      id,
      routine_id: routineId,
      day_number: dayNumber,
      title,
      notes,
    })
    .select(DAY_FIELDS)
    .single()

  if (error) throw error
  return data
}

/**
 * Actualiza un día por id. Devuelve la fila actualizada.
 * @param {string} id
 * @param {object} fields
 * @returns {Promise<object>}
 */
export async function updateDay(id, fields) {
  const { data, error } = await supabase
    .from('routine_days')
    .update(fields)
    .eq('id', id)
    .select(DAY_FIELDS)
    .single()

  if (error) throw error
  return data
}

/**
 * Elimina un día por id. Los routine_exercises del día caen en cascada
 * (routine_exercises.routine_day_id ... on delete cascade).
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteDay(id) {
  const { error } = await supabase.from('routine_days').delete().eq('id', id)
  if (error) throw error
}

const ROUTINE_EXERCISE_FIELDS =
  'id, routine_day_id, exercise_id, order_index, sets, reps, rest_seconds, tempo, notes, created_at, updated_at'

/**
 * Añade un ejercicio a un día de rutina. El id lo genera el cliente. orderIndex
 * debe ser >= 0 y único dentro del día (routine_exercises_day_order_key);
 * normalmente el composable pasa la posición final (n existentes).
 * @param {{id:string, routineDayId:string, exerciseId:string, orderIndex:number, sets?:string|null, reps?:string|null, restSeconds?:number|null, tempo?:string|null, notes?:string|null}} input
 * @returns {Promise<object>}
 */
export async function createRoutineExercise({
  id,
  routineDayId,
  exerciseId,
  orderIndex,
  sets = null,
  reps = null,
  restSeconds = null,
  tempo = null,
  notes = null,
}) {
  const { data, error } = await supabase
    .from('routine_exercises')
    .insert({
      id,
      routine_day_id: routineDayId,
      exercise_id: exerciseId,
      order_index: orderIndex,
      sets,
      reps,
      rest_seconds: restSeconds,
      tempo,
      notes,
    })
    .select(ROUTINE_EXERCISE_FIELDS)
    .single()

  if (error) throw error
  return data
}

/**
 * Actualiza un ejercicio de rutina por id. Devuelve la fila actualizada.
 * @param {string} id
 * @param {object} fields
 * @returns {Promise<object>}
 */
export async function updateRoutineExercise(id, fields) {
  const { data, error } = await supabase
    .from('routine_exercises')
    .update(fields)
    .eq('id', id)
    .select(ROUTINE_EXERCISE_FIELDS)
    .single()

  if (error) throw error
  return data
}

/**
 * Elimina un ejercicio de rutina por id.
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteRoutineExercise(id) {
  const { error } = await supabase.from('routine_exercises').delete().eq('id', id)
  if (error) throw error
}

/**
 * Pasa una rutina a status='assigned'. El trigger validate_assigned_routine
 * exige una compra 'approved' del cliente y fija assigned_at; aquí NO se envía
 * assigned_at. Traducción de errores de dominio:
 * - Si el mensaje del trigger incluye 'approved purchase' → Error tipado
 *   .code='no_approved_purchase' (patrón del 'in_use' de deleteExercise).
 * - Si Postgres devuelve 23505 (routines_purchase_id_key: ya existe otra rutina
 *   para esta compra) → Error tipado .code='routine_exists' para que la UI edite
 *   la rutina existente (fetchRoutineByPurchaseId).
 * Cualquier otro error se relanza tal cual.
 * @param {string} id
 * @returns {Promise<object>}
 */
export async function assignRoutine(id) {
  const { data, error } = await supabase
    .from('routines')
    .update({ status: 'assigned' })
    .eq('id', id)
    .select(ROUTINE_FIELDS)
    .single()

  if (error) {
    if (typeof error.message === 'string' && error.message.includes('approved purchase')) {
      const noPurchaseError = new Error(
        'No se puede asignar la rutina: el cliente no tiene una compra aprobada.',
      )
      noPurchaseError.code = 'no_approved_purchase'
      noPurchaseError.cause = error
      throw noPurchaseError
    }
    if (error.code === '23505') {
      const existsError = new Error(
        'Esta compra ya tiene una rutina asignada. Edita la rutina existente.',
      )
      existsError.code = 'routine_exists'
      existsError.cause = error
      throw existsError
    }
    throw error
  }

  return data
}

/**
 * Devuelve una rutina asignada a estado 'draft'. El trigger pone assigned_at a
 * null al salir de 'assigned'. Devuelve la fila actualizada.
 * @param {string} id
 * @returns {Promise<object>}
 */
export async function unassignRoutine(id) {
  const { data, error } = await supabase
    .from('routines')
    .update({ status: 'draft' })
    .eq('id', id)
    .select(ROUTINE_FIELDS)
    .single()

  if (error) throw error
  return data
}

/**
 * Archiva una rutina (status='archived'). Devuelve la fila actualizada.
 * @param {string} id
 * @returns {Promise<object>}
 */
export async function archiveRoutine(id) {
  const { data, error } = await supabase
    .from('routines')
    .update({ status: 'archived' })
    .eq('id', id)
    .select(ROUTINE_FIELDS)
    .single()

  if (error) throw error
  return data
}

/**
 * Aplica un update individual de order_index a un routine_exercise, lanzando en
 * error. Auxiliar del two-pass de reorderExercises.
 * @param {string} id
 * @param {number} orderIndex
 * @returns {Promise<void>}
 */
async function setExerciseOrder(id, orderIndex) {
  const { error } = await supabase
    .from('routine_exercises')
    .update({ order_index: orderIndex })
    .eq('id', id)
  if (error) throw error
}

/**
 * Aplica un update individual de day_number a un routine_day, lanzando en error.
 * Auxiliar del two-pass de reorderDays.
 * @param {string} id
 * @param {number} dayNumber
 * @returns {Promise<void>}
 */
async function setDayNumber(id, dayNumber) {
  const { error } = await supabase
    .from('routine_days')
    .update({ day_number: dayNumber })
    .eq('id', id)
  if (error) throw error
}

/**
 * Reordena los ejercicios de un día dejando order_index contiguo 0..n-1 según
 * el orden de `orderedIds`. Usa un two-pass con OFFSET ALTO (+1000) para no
 * colisionar con el UNIQUE (routine_day_id, order_index) ni violar el CHECK
 * order_index>=0:
 *   Fase 1: sube cada fila a un índice temporal alto (1000, 1001, …) libre.
 *   Fase 2: la baja a su valor final contiguo (0, 1, …).
 * Los updates son individuales (secuenciales) para respetar el UNIQUE fila a
 * fila. La UI debe recargar desde DB (fetchRoutineWithContent) al terminar.
 * @param {string} routineDayId  (contexto; los ids ya identifican las filas)
 * @param {string[]} orderedIds  ids de routine_exercises en el orden deseado
 * @returns {Promise<void>}
 */
export async function reorderExercises(routineDayId, orderedIds) {
  // Fase 1: rango temporal alto, preservando el orden relativo destino.
  for (let i = 0; i < orderedIds.length; i += 1) {
    await setExerciseOrder(orderedIds[i], REORDER_OFFSET + i)
  }
  // Fase 2: índices finales contiguos 0..n-1.
  for (let i = 0; i < orderedIds.length; i += 1) {
    await setExerciseOrder(orderedIds[i], i)
  }
}

/**
 * Reordena los días de una rutina dejando day_number contiguo 1..n según el
 * orden de `orderedIds`. Mismo two-pass con OFFSET ALTO (+1000) para no
 * colisionar con el UNIQUE (routine_id, day_number) ni violar el CHECK
 * day_number>0 (los días arrancan en 1, no en 0).
 * @param {string} routineId  (contexto; los ids ya identifican las filas)
 * @param {string[]} orderedIds  ids de routine_days en el orden deseado
 * @returns {Promise<void>}
 */
export async function reorderDays(routineId, orderedIds) {
  // Fase 1: rango temporal alto (1000, 1001, …), todos > 0.
  for (let i = 0; i < orderedIds.length; i += 1) {
    await setDayNumber(orderedIds[i], REORDER_OFFSET + i)
  }
  // Fase 2: numeración final contigua 1..n.
  for (let i = 0; i < orderedIds.length; i += 1) {
    await setDayNumber(orderedIds[i], i + 1)
  }
}
