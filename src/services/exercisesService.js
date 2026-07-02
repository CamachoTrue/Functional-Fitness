import { supabase } from './supabaseClient'

/**
 * Service de ejercicios para el área de administración. Sigue el patrón de los
 * demás services: importa `supabase` de supabaseClient y lanza ante error. La
 * escritura está gobernada por la RLS exercises_admin_write (solo admin).
 *
 * El video vive en el bucket privado `exercise-videos` y se gestiona en
 * storageService; aquí solo se guarda/lee la columna `video_path`. El id del
 * ejercicio lo genera el cliente (crypto.randomUUID) para que fila y objeto
 * compartan identidad y el CHECK del path se cumpla.
 */

// Campos ligeros para el listado.
const EXERCISE_LIST_FIELDS =
  'id, name, category, muscle_group, level, equipment, video_path, created_at'

// Todos los campos editables/mostrables en el detalle.
const EXERCISE_FIELDS =
  'id, name, category, muscle_group, level, equipment, description, common_mistakes, video_path, created_at, updated_at'

/**
 * Lista todos los ejercicios ordenados por nombre (asc).
 * @returns {Promise<Array<object>>}
 */
export async function fetchAllExercises() {
  const { data, error } = await supabase
    .from('exercises')
    .select(EXERCISE_LIST_FIELDS)
    .order('name', { ascending: true })

  if (error) throw error
  return data ?? []
}

/**
 * Lee un ejercicio por id (maybeSingle → null si no existe o no es visible).
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export async function fetchExerciseById(id) {
  const { data, error } = await supabase
    .from('exercises')
    .select(EXERCISE_FIELDS)
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return data ?? null
}

/**
 * Inserta un ejercicio. El payload debe incluir el id (uuid del cliente), los
 * campos y opcionalmente video_path. Devuelve la fila creada.
 * @param {object} payload
 * @returns {Promise<object>}
 */
export async function createExercise(payload) {
  const { data, error } = await supabase
    .from('exercises')
    .insert(payload)
    .select(EXERCISE_FIELDS)
    .single()

  if (error) throw error
  return data
}

/**
 * Actualiza un ejercicio por id. Devuelve la fila actualizada.
 * @param {string} id
 * @param {object} payload
 * @returns {Promise<object>}
 */
export async function updateExercise(id, payload) {
  const { data, error } = await supabase
    .from('exercises')
    .update(payload)
    .eq('id', id)
    .select(EXERCISE_FIELDS)
    .single()

  if (error) throw error
  return data
}

/**
 * Elimina un ejercicio por id. Si está referenciado por routine_exercises
 * (FK on delete restrict), Postgres devuelve el código 23503; en ese caso se
 * relanza un error tipado con .code = 'in_use' para que la UI muestre el caso
 * "en uso" y NO se toque Storage. Cualquier otro error se relanza tal cual.
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteExercise(id) {
  const { error } = await supabase.from('exercises').delete().eq('id', id)

  if (error) {
    if (error.code === '23503') {
      const inUseError = new Error(
        'El ejercicio está en uso en una o más rutinas y no se puede eliminar.',
      )
      inUseError.code = 'in_use'
      inUseError.cause = error
      throw inUseError
    }
    throw error
  }
}
