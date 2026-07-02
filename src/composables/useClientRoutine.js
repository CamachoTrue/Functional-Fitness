import { ref } from 'vue'

import { fetchMyAssignedRoutine } from '../services/routineService'
import { createSignedVideoUrl } from '../services/storageService'

/**
 * Estado y lógica de la rutina asignada del cliente. Sigue el patrón de los
 * demás composables (refs loading/error/data + load(), mensajes en español, sin
 * acceso directo a Supabase: todo pasa por services).
 *
 * REGLAS DE DOMINIO:
 * - fetchMyAssignedRoutine() NO filtra por user_id: las políticas RLS ya limitan
 *   la visibilidad a la rutina 'assigned' del propio usuario con compra vigente.
 *   Si la RLS no expone ninguna rutina devuelve null → la UI muestra "en
 *   preparación"/vacío, sin fuga de información.
 * - Los videos viven en un bucket privado. La URL firmada se genera ON-DEMAND al
 *   reproducir (getVideoUrl), solo para videos de la rutina assigned vigente
 *   (policy exercise_videos_client_read_assigned). Si el ejercicio no tiene video
 *   (video_path null) no se llama a storage; si la firma falla se captura el
 *   error y se devuelve null para que la vista muestre "Video no disponible" sin
 *   romper el resto de la rutina.
 */
export function useClientRoutine() {
  const routine = ref(null)
  const loading = ref(false)
  const error = ref(null)

  async function load() {
    loading.value = true
    error.value = null
    routine.value = null

    try {
      routine.value = await fetchMyAssignedRoutine()
    } catch {
      error.value = 'No pudimos cargar tu rutina. Intenta de nuevo en unos minutos.'
      routine.value = null
    } finally {
      loading.value = false
    }
  }

  /**
   * Firma bajo demanda la URL del video de un ejercicio. Devuelve la signed URL
   * o null: null si no hay path (ejercicio sin video) o si la firma falla. Nunca
   * lanza, para no romper la reproducción del resto de ejercicios.
   * @param {string|null|undefined} path video_path del ejercicio
   * @returns {Promise<string|null>}
   */
  async function getVideoUrl(path) {
    if (!path) return null
    try {
      return await createSignedVideoUrl(path)
    } catch {
      return null
    }
  }

  return {
    routine,
    loading,
    error,
    load,
    getVideoUrl,
  }
}
