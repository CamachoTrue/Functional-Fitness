import { ref } from 'vue'

import { fetchAllRoutines, fetchClients } from '../services/adminService'

/**
 * Lista de rutinas para el área de administración, enriquecida con los datos del
 * cliente. La unión por user_id se hace EN EL CLIENTE (no hay embedding
 * profiles↔routines), igual que en useAdminQuestionnaires.
 *
 * Cada fila expone las columnas de cabecera de la rutina más:
 * - client_name / client_email: datos del perfil (o null si no es visible).
 *
 * Patrón usePackages/useAdminQuestionnaires: loading/error + load() idempotente;
 * errores en español; sin Supabase directo.
 */
export function useAdminRoutines() {
  const routines = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function load() {
    loading.value = true
    error.value = null
    try {
      const [routineList, profiles] = await Promise.all([
        fetchAllRoutines(),
        fetchClients(),
      ])

      const profileByUser = new Map(profiles.map((profile) => [profile.id, profile]))

      routines.value = routineList.map((routine) => {
        const profile = profileByUser.get(routine.user_id) ?? null
        return {
          ...routine,
          client_name: profile?.full_name ?? null,
          client_email: profile?.email ?? null,
        }
      })
    } catch {
      error.value = 'No pudimos cargar las rutinas. Intenta de nuevo en unos minutos.'
      routines.value = []
    } finally {
      loading.value = false
    }
  }

  return { routines, loading, error, load }
}
