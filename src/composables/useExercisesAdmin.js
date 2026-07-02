import { ref } from 'vue'

import {
  createExercise,
  deleteExercise,
  fetchAllExercises,
  updateExercise,
} from '../services/exercisesService'
import {
  buildVideoPath,
  createSignedVideoUrl,
  removeExerciseVideo,
  uploadExerciseVideo,
  validateVideoFile,
} from '../services/storageService'

/**
 * Estado y operaciones de administración de ejercicios, orquestando
 * exercisesService (DB) + storageService (bucket privado exercise-videos).
 * Sigue el patrón de useAdminClients (refs loading/error/data + load()
 * idempotente) y añade `saving` para las mutaciones. Errores en español; sin
 * acceso directo a Supabase.
 *
 * Reglas de integridad video↔fila (decisiones de diseño):
 * - CREAR: generar id en cliente → validar file → subir a Storage → INSERT con
 *   id y video_path; si el INSERT falla tras subir, BORRAR el objeto (rollback,
 *   sin huérfanos).
 * - REEMPLAZAR: subir el nuevo (upsert si mismo filename) → UPDATE video_path →
 *   borrar el anterior SOLO tras UPDATE ok (y solo si el path cambió).
 * - ELIMINAR: DELETE en DB primero; si FK (23503) exponer 'en uso' y NO tocar
 *   Storage; si borra bien y tenía video_path, borrar el objeto (best-effort).
 */

export function useExercisesAdmin() {
  const exercises = ref([])
  const loading = ref(false)
  const error = ref(null)
  const saving = ref(false)

  async function load() {
    loading.value = true
    error.value = null
    try {
      exercises.value = await fetchAllExercises()
    } catch {
      error.value = 'No pudimos cargar los ejercicios. Intenta de nuevo en unos minutos.'
      exercises.value = []
    } finally {
      loading.value = false
    }
  }

  /**
   * Crea un ejercicio con (opcionalmente) un video. Genera el id en el cliente
   * para que fila y objeto compartan identidad. Si se pasa file: valida, sube y
   * hace rollback del objeto si el INSERT falla.
   * @param {{ fields: object, file?: File|null }} args
   * @returns {Promise<object>} la fila creada
   */
  async function createWithVideo({ fields, file = null }) {
    saving.value = true
    error.value = null

    const id = crypto.randomUUID()
    let uploadedPath = null

    try {
      let videoPath = null
      if (file) {
        const validationError = validateVideoFile(file)
        if (validationError) {
          error.value = validationError
          throw new Error(validationError)
        }
        videoPath = buildVideoPath(id, file.name)
        await uploadExerciseVideo(videoPath, file, { upsert: false })
        uploadedPath = videoPath
      }

      let created
      try {
        created = await createExercise({ id, ...fields, video_path: videoPath })
      } catch (insertError) {
        // Rollback: el INSERT falló tras subir el objeto → borrarlo para no
        // dejar huérfanos. El borrado es best-effort; no enmascara el error real.
        if (uploadedPath) {
          try {
            await removeExerciseVideo(uploadedPath)
          } catch {
            /* best-effort: ignoramos el fallo de limpieza */
          }
        }
        throw insertError
      }

      exercises.value = [created, ...exercises.value]
      return created
    } catch (err) {
      if (!error.value) {
        error.value = 'No pudimos crear el ejercicio. Revisa los datos e intenta de nuevo.'
      }
      throw err
    } finally {
      saving.value = false
    }
  }

  /**
   * Actualiza un ejercicio. Si se pasa un file nuevo: sube (upsert por si el
   * filename coincide con el anterior), hace UPDATE del video_path y, solo tras
   * el UPDATE ok, borra el objeto anterior si el path cambió. Sin file, solo
   * actualiza los campos.
   * @param {string} id
   * @param {{ fields: object, file?: File|null, currentPath?: string|null }} args
   * @returns {Promise<object>} la fila actualizada
   */
  async function updateWithVideo(id, { fields, file = null, currentPath = null }) {
    saving.value = true
    error.value = null
    try {
      const payload = { ...fields }
      let newPath = null

      if (file) {
        const validationError = validateVideoFile(file)
        if (validationError) {
          error.value = validationError
          throw new Error(validationError)
        }
        newPath = buildVideoPath(id, file.name)
        // upsert=true: si el filename coincide con el anterior, reemplaza el
        // objeto en su sitio en vez de fallar por "ya existe".
        await uploadExerciseVideo(newPath, file, { upsert: true })
        payload.video_path = newPath
      }

      const updated = await updateExercise(id, payload)

      // Borrar el anterior SOLO tras el UPDATE ok y solo si el path cambió
      // (best-effort: si falla, la fila ya quedó correcta).
      if (file && currentPath && currentPath !== newPath) {
        try {
          await removeExerciseVideo(currentPath)
        } catch {
          /* best-effort: ignoramos el fallo de limpieza del video anterior */
        }
      }

      exercises.value = exercises.value.map((ex) => (ex.id === id ? updated : ex))
      return updated
    } catch (err) {
      if (!error.value) {
        error.value = 'No pudimos actualizar el ejercicio. Revisa los datos e intenta de nuevo.'
      }
      throw err
    } finally {
      saving.value = false
    }
  }

  /**
   * Elimina un ejercicio: DELETE en DB primero. Si está en uso (FK 23503) se
   * expone el mensaje 'en uso' y NO se toca Storage. Si borra bien y tenía
   * video_path, se borra el objeto (best-effort).
   * @param {string} id
   * @param {string|null} videoPath
   * @returns {Promise<void>}
   */
  async function remove(id, videoPath = null) {
    saving.value = true
    error.value = null
    try {
      await deleteExercise(id)

      if (videoPath) {
        try {
          await removeExerciseVideo(videoPath)
        } catch {
          /* best-effort: la fila ya se borró; ignoramos el fallo de limpieza */
        }
      }

      exercises.value = exercises.value.filter((ex) => ex.id !== id)
    } catch (err) {
      if (err?.code === 'in_use') {
        error.value = 'El ejercicio está en uso en una o más rutinas y no se puede eliminar.'
      } else {
        error.value = 'No pudimos eliminar el ejercicio. Intenta de nuevo en unos minutos.'
      }
      throw err
    } finally {
      saving.value = false
    }
  }

  /**
   * Devuelve una URL firmada temporal para previsualizar el video de un
   * ejercicio. Lanza en error para que la vista lo maneje.
   * @param {string} path
   * @returns {Promise<string>}
   */
  function getPreviewUrl(path) {
    return createSignedVideoUrl(path)
  }

  return {
    exercises,
    loading,
    error,
    saving,
    load,
    createWithVideo,
    updateWithVideo,
    remove,
    getPreviewUrl,
  }
}
