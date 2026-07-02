import { ref } from 'vue'

import {
  archiveRoutine,
  assignRoutine,
  createDay,
  createRoutine,
  createRoutineExercise,
  deleteDay,
  deleteRoutineExercise,
  fetchRoutineWithContent,
  reorderDays,
  reorderExercises,
  unassignRoutine,
  updateDay,
  updateRoutine,
  updateRoutineExercise,
} from '../services/routineService'

/**
 * Estado y operaciones del constructor de rutinas (área admin), orquestando
 * routineService. Sigue el patrón de useExercisesAdmin: refs
 * loading/error/saving + load() idempotente; errores en español; sin acceso
 * directo a Supabase. Los ids se generan en el cliente (crypto.randomUUID) para
 * que fila y objeto compartan identidad.
 *
 * El estado local (`routine` con `routine_days` anidados, cada día con sus
 * `routine_exercises` ordenados) se mantiene sincronizado tras cada mutación.
 * Las operaciones de reordenamiento delegan en el two-pass del service y luego
 * RECARGAN desde DB (fetchRoutineWithContent) porque el service normaliza los
 * índices/day_numbers a valores contiguos y esa es la fuente de verdad.
 *
 * REGLAS DE DOMINIO relevantes (ver routineService):
 * - assign(): pasar a 'assigned' exige una compra approved del cliente; el
 *   service traduce el fallo del trigger a error.code='no_approved_purchase' y
 *   la colisión de "una rutina por compra" a error.code='routine_exists'. Aquí
 *   se traducen a mensajes en español expuestos en `error`.
 * - Los días arrancan en day_number 1..n; los ejercicios en order_index 0..n-1.
 */
export function useRoutineBuilder() {
  const routine = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const saving = ref(false)

  /**
   * Encuentra un día del estado local por id.
   * @param {string} dayId
   * @returns {object|null}
   */
  function findDay(dayId) {
    return routine.value?.routine_days?.find((day) => day.id === dayId) ?? null
  }

  /**
   * Carga una rutina con todo su contenido (días + ejercicios ordenados).
   * Idempotente: puede llamarse para (re)cargar en cualquier momento.
   * @param {string} routineId
   * @returns {Promise<void>}
   */
  async function load(routineId) {
    loading.value = true
    error.value = null
    try {
      const data = await fetchRoutineWithContent(routineId)
      routine.value = data
        ? { ...data, routine_days: data.routine_days ?? [] }
        : null
    } catch {
      error.value = 'No pudimos cargar la rutina. Intenta de nuevo en unos minutos.'
      routine.value = null
    } finally {
      loading.value = false
    }
  }

  /**
   * Recarga el contenido de la rutina actual desde DB. Se usa tras reordenar
   * para reflejar la numeración/índices contiguos que fija el service.
   * @returns {Promise<void>}
   */
  async function reload() {
    if (!routine.value) return
    const data = await fetchRoutineWithContent(routine.value.id)
    routine.value = data
      ? { ...data, routine_days: data.routine_days ?? [] }
      : null
  }

  /**
   * Crea una rutina en estado 'draft' y la deja como rutina activa del
   * constructor (con routine_days vacío para empezar a añadir días).
   * @param {{ userId:string, purchaseId?:string|null, name:string, objective?:string|null, generalNotes?:string|null }} input
   * @returns {Promise<object>} la fila creada
   */
  async function create({ userId, purchaseId = null, name, objective = null, generalNotes = null }) {
    saving.value = true
    error.value = null
    try {
      const created = await createRoutine({
        id: crypto.randomUUID(),
        userId,
        purchaseId,
        name,
        objective,
        generalNotes,
      })
      routine.value = { ...created, routine_days: [] }
      return created
    } catch (err) {
      error.value = 'No pudimos crear la rutina. Revisa los datos e intenta de nuevo.'
      throw err
    } finally {
      saving.value = false
    }
  }

  /**
   * Actualiza los metadatos (name/objective/general_notes) de la rutina actual.
   * @param {object} fields
   * @returns {Promise<object>} la fila actualizada
   */
  async function updateMeta(fields) {
    saving.value = true
    error.value = null
    try {
      const updated = await updateRoutine(routine.value.id, fields)
      routine.value = { ...routine.value, ...updated }
      return updated
    } catch (err) {
      error.value = 'No pudimos guardar los cambios de la rutina. Intenta de nuevo.'
      throw err
    } finally {
      saving.value = false
    }
  }

  /**
   * Añade un día al final de la rutina (day_number = n+1) y lo agrega al estado
   * local con routine_exercises vacío.
   * @param {{ title:string, notes?:string|null }} input
   * @returns {Promise<object>} el día creado
   */
  async function addDay({ title, notes = null }) {
    saving.value = true
    error.value = null
    try {
      const dayNumber = (routine.value.routine_days?.length ?? 0) + 1
      const created = await createDay({
        id: crypto.randomUUID(),
        routineId: routine.value.id,
        dayNumber,
        title,
        notes,
      })
      routine.value.routine_days = [
        ...(routine.value.routine_days ?? []),
        { ...created, routine_exercises: [] },
      ]
      return created
    } catch (err) {
      error.value = 'No pudimos añadir el día. Intenta de nuevo.'
      throw err
    } finally {
      saving.value = false
    }
  }

  /**
   * Actualiza un día (title/notes) y sincroniza el estado local preservando sus
   * ejercicios anidados.
   * @param {string} dayId
   * @param {object} fields
   * @returns {Promise<object>} el día actualizado
   */
  async function editDay(dayId, fields) {
    saving.value = true
    error.value = null
    try {
      const updated = await updateDay(dayId, fields)
      routine.value.routine_days = routine.value.routine_days.map((day) =>
        day.id === dayId ? { ...day, ...updated } : day,
      )
      return updated
    } catch (err) {
      error.value = 'No pudimos guardar el día. Intenta de nuevo.'
      throw err
    } finally {
      saving.value = false
    }
  }

  /**
   * Elimina un día (sus ejercicios caen en cascada en DB) y lo quita del estado
   * local. No renumera en DB: los day_number restantes siguen siendo válidos y
   * únicos; un reorder posterior los normalizaría si se desea contigüidad.
   * @param {string} dayId
   * @returns {Promise<void>}
   */
  async function removeDay(dayId) {
    saving.value = true
    error.value = null
    try {
      await deleteDay(dayId)
      routine.value.routine_days = routine.value.routine_days.filter(
        (day) => day.id !== dayId,
      )
    } catch (err) {
      error.value = 'No pudimos eliminar el día. Intenta de nuevo.'
      throw err
    } finally {
      saving.value = false
    }
  }

  /**
   * Añade un ejercicio al final de un día (order_index = n existentes) y lo
   * agrega al estado local con los datos del ejercicio de la biblioteca para
   * mostrar el nombre sin recargar.
   * @param {string} dayId
   * @param {{ exercise:object, sets?:string|null, reps?:string|null, restSeconds?:number|null, tempo?:string|null, notes?:string|null }} input
   * @returns {Promise<object>} el routine_exercise creado
   */
  async function addExercise(dayId, { exercise, sets = null, reps = null, restSeconds = null, tempo = null, notes = null }) {
    saving.value = true
    error.value = null
    try {
      const day = findDay(dayId)
      const orderIndex = day?.routine_exercises?.length ?? 0
      const created = await createRoutineExercise({
        id: crypto.randomUUID(),
        routineDayId: dayId,
        exerciseId: exercise.id,
        orderIndex,
        sets,
        reps,
        restSeconds,
        tempo,
        notes,
      })
      // Adjuntamos el snapshot del ejercicio (name/video_path/…) igual que lo
      // devolvería el embedding de fetchRoutineWithContent.
      const withExercise = {
        ...created,
        exercises: {
          id: exercise.id,
          name: exercise.name,
          video_path: exercise.video_path ?? null,
          muscle_group: exercise.muscle_group ?? null,
          level: exercise.level ?? null,
        },
      }
      routine.value.routine_days = routine.value.routine_days.map((d) =>
        d.id === dayId
          ? { ...d, routine_exercises: [...(d.routine_exercises ?? []), withExercise] }
          : d,
      )
      return created
    } catch (err) {
      error.value = 'No pudimos añadir el ejercicio. Intenta de nuevo.'
      throw err
    } finally {
      saving.value = false
    }
  }

  /**
   * Actualiza un ejercicio de rutina (sets/reps/rest_seconds/tempo/notes) y
   * sincroniza el estado local preservando el snapshot del ejercicio.
   * @param {string} dayId
   * @param {string} exerciseRowId  id de la fila routine_exercises
   * @param {object} fields
   * @returns {Promise<object>} la fila actualizada
   */
  async function editExercise(dayId, exerciseRowId, fields) {
    saving.value = true
    error.value = null
    try {
      const updated = await updateRoutineExercise(exerciseRowId, fields)
      routine.value.routine_days = routine.value.routine_days.map((day) =>
        day.id === dayId
          ? {
              ...day,
              routine_exercises: day.routine_exercises.map((ex) =>
                ex.id === exerciseRowId ? { ...ex, ...updated, exercises: ex.exercises } : ex,
              ),
            }
          : day,
      )
      return updated
    } catch (err) {
      error.value = 'No pudimos guardar el ejercicio. Intenta de nuevo.'
      throw err
    } finally {
      saving.value = false
    }
  }

  /**
   * Elimina un ejercicio de un día y lo quita del estado local.
   * @param {string} dayId
   * @param {string} exerciseRowId
   * @returns {Promise<void>}
   */
  async function removeExercise(dayId, exerciseRowId) {
    saving.value = true
    error.value = null
    try {
      await deleteRoutineExercise(exerciseRowId)
      routine.value.routine_days = routine.value.routine_days.map((day) =>
        day.id === dayId
          ? {
              ...day,
              routine_exercises: day.routine_exercises.filter((ex) => ex.id !== exerciseRowId),
            }
          : day,
      )
    } catch (err) {
      error.value = 'No pudimos eliminar el ejercicio. Intenta de nuevo.'
      throw err
    } finally {
      saving.value = false
    }
  }

  /**
   * Mueve un día una posición hacia arriba/abajo. Calcula el nuevo orden,
   * delega en reorderDays (two-pass) y RECARGA desde DB para reflejar los
   * day_number contiguos definitivos.
   * @param {string} dayId
   * @param {'up'|'down'} direction
   * @returns {Promise<void>}
   */
  async function moveDay(dayId, direction) {
    const days = routine.value?.routine_days ?? []
    const index = days.findIndex((day) => day.id === dayId)
    const target = direction === 'up' ? index - 1 : index + 1
    if (index === -1 || target < 0 || target >= days.length) return

    saving.value = true
    error.value = null
    try {
      const orderedIds = days.map((day) => day.id)
      const moved = orderedIds.splice(index, 1)[0]
      orderedIds.splice(target, 0, moved)
      await reorderDays(routine.value.id, orderedIds)
      await reload()
    } catch (err) {
      error.value = 'No pudimos reordenar los días. Recargamos desde el servidor.'
      try {
        await reload()
      } catch {
        /* best-effort: el error principal ya está expuesto */
      }
      throw err
    } finally {
      saving.value = false
    }
  }

  /**
   * Mueve un ejercicio una posición hacia arriba/abajo dentro de su día.
   * Delega en reorderExercises (two-pass) y RECARGA desde DB.
   * @param {string} dayId
   * @param {string} exerciseRowId
   * @param {'up'|'down'} direction
   * @returns {Promise<void>}
   */
  async function moveExercise(dayId, exerciseRowId, direction) {
    const day = findDay(dayId)
    const exercises = day?.routine_exercises ?? []
    const index = exercises.findIndex((ex) => ex.id === exerciseRowId)
    const target = direction === 'up' ? index - 1 : index + 1
    if (index === -1 || target < 0 || target >= exercises.length) return

    saving.value = true
    error.value = null
    try {
      const orderedIds = exercises.map((ex) => ex.id)
      const moved = orderedIds.splice(index, 1)[0]
      orderedIds.splice(target, 0, moved)
      await reorderExercises(dayId, orderedIds)
      await reload()
    } catch (err) {
      error.value = 'No pudimos reordenar los ejercicios. Recargamos desde el servidor.'
      try {
        await reload()
      } catch {
        /* best-effort */
      }
      throw err
    } finally {
      saving.value = false
    }
  }

  /**
   * Asigna la rutina (draft → assigned). El service exige una compra approved
   * (trigger) y unicidad por compra; aquí se traducen sus errores tipados a
   * mensajes claros en español expuestos en `error`.
   * @returns {Promise<object>} la fila actualizada
   */
  async function assign() {
    saving.value = true
    error.value = null
    try {
      const updated = await assignRoutine(routine.value.id)
      routine.value = { ...routine.value, ...updated }
      return updated
    } catch (err) {
      if (err?.code === 'no_approved_purchase') {
        error.value =
          'No se puede asignar la rutina: el cliente no tiene una compra aprobada.'
      } else if (err?.code === 'routine_exists') {
        error.value =
          'Esta compra ya tiene una rutina asignada. Edita la rutina existente.'
      } else {
        error.value = 'No pudimos asignar la rutina. Intenta de nuevo en unos minutos.'
      }
      throw err
    } finally {
      saving.value = false
    }
  }

  /**
   * Devuelve la rutina a borrador (assigned → draft).
   * @returns {Promise<object>} la fila actualizada
   */
  async function unassign() {
    saving.value = true
    error.value = null
    try {
      const updated = await unassignRoutine(routine.value.id)
      routine.value = { ...routine.value, ...updated }
      return updated
    } catch (err) {
      error.value = 'No pudimos devolver la rutina a borrador. Intenta de nuevo.'
      throw err
    } finally {
      saving.value = false
    }
  }

  /**
   * Archiva la rutina (status → archived).
   * @returns {Promise<object>} la fila actualizada
   */
  async function archive() {
    saving.value = true
    error.value = null
    try {
      const updated = await archiveRoutine(routine.value.id)
      routine.value = { ...routine.value, ...updated }
      return updated
    } catch (err) {
      error.value = 'No pudimos archivar la rutina. Intenta de nuevo.'
      throw err
    } finally {
      saving.value = false
    }
  }

  return {
    routine,
    loading,
    error,
    saving,
    load,
    create,
    updateMeta,
    addDay,
    editDay,
    removeDay,
    addExercise,
    editExercise,
    removeExercise,
    moveDay,
    moveExercise,
    assign,
    unassign,
    archive,
  }
}
