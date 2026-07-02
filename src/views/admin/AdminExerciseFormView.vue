<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'

import BaseButton from '../../components/common/BaseButton.vue'
import EmptyState from '../../components/common/EmptyState.vue'
import LoadingSpinner from '../../components/common/LoadingSpinner.vue'
import ExerciseForm from '../../components/exercises/ExerciseForm.vue'
import { useExercisesAdmin } from '../../composables/useExercisesAdmin'
import { fetchExerciseById } from '../../services/exercisesService'

/**
 * Vista de creación y edición de ejercicios. Detecta el modo por la presencia de
 * `id` (prop de la ruta). En edición carga el ejercicio (todos los campos) para
 * poblar el formulario y previsualizar el video guardado (signed URL vía el
 * composable). Al guardar delega en useExercisesAdmin (con la lógica de rollback
 * y reemplazo de video) y navega a la lista.
 */
const props = defineProps({
  id: {
    type: String,
    default: '',
  },
})

const router = useRouter()
const { saving, error, createWithVideo, updateWithVideo, getPreviewUrl } = useExercisesAdmin()

const isEdit = computed(() => Boolean(props.id))

const initialValue = ref(null)
const loading = ref(false)
const loadError = ref('')
const notFound = ref(false)

async function loadExercise() {
  if (!isEdit.value) return
  loading.value = true
  loadError.value = ''
  notFound.value = false
  try {
    const exercise = await fetchExerciseById(props.id)
    if (!exercise) {
      notFound.value = true
    } else {
      initialValue.value = exercise
    }
  } catch {
    loadError.value = 'No pudimos cargar el ejercicio. Intenta de nuevo en unos minutos.'
  } finally {
    loading.value = false
  }
}

async function handleSubmit({ fields, file }) {
  try {
    if (isEdit.value) {
      await updateWithVideo(props.id, {
        fields,
        file,
        currentPath: initialValue.value?.video_path ?? null,
      })
    } else {
      await createWithVideo({ fields, file })
    }
    router.push({ name: 'admin-exercises' })
  } catch {
    // useExercisesAdmin ya expone el mensaje en `error`; la vista lo muestra.
  }
}

onMounted(loadExercise)
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <RouterLink
      class="focus-ring inline-flex items-center rounded-sm text-sm font-semibold text-brand-green transition hover:underline"
      :to="{ name: 'admin-exercises' }"
    >
      ← Volver a ejercicios
    </RouterLink>

    <h1 class="mt-4 text-3xl font-black tracking-tight">
      {{ isEdit ? 'Editar ejercicio' : 'Nuevo ejercicio' }}
    </h1>

    <div class="mt-8">
      <LoadingSpinner v-if="loading" label="Cargando ejercicio" />

      <div
        v-else-if="loadError"
        class="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm"
      >
        <p class="text-sm text-red-700" role="alert">{{ loadError }}</p>
        <BaseButton class="mt-4" type="button" variant="secondary" @click="loadExercise">
          Recargar
        </BaseButton>
      </div>

      <EmptyState
        v-else-if="notFound"
        title="Ejercicio no encontrado"
        description="Este ejercicio no existe o no tienes permiso para verlo."
      />

      <template v-else>
        <p v-if="error" class="mb-4 text-sm text-red-700" role="alert">{{ error }}</p>
        <ExerciseForm
          :initial-value="initialValue"
          :saving="saving"
          :submit-label="isEdit ? 'Guardar cambios' : 'Crear ejercicio'"
          :get-preview-url="getPreviewUrl"
          @submit="handleSubmit"
        />
      </template>
    </div>
  </div>
</template>
