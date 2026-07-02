<script setup>
import { computed, onMounted, ref } from 'vue'

import { fetchAllExercises } from '../../services/exercisesService'
import BaseButton from '../common/BaseButton.vue'
import BaseInput from '../common/BaseInput.vue'
import BaseSelect from '../common/BaseSelect.vue'

/**
 * Selector de un ejercicio de la biblioteca para añadirlo a un día de rutina.
 * Carga los ejercicios con fetchAllExercises (exercisesService) y ofrece un
 * buscador por nombre + un BaseSelect filtrado. Al confirmar emite `add` con el
 * objeto completo del ejercicio (id, name, video_path, muscle_group, level) para
 * que el composable pueda mostrar el nombre sin recargar. Solo usa componentes
 * base; no accede a Supabase directamente.
 */
const props = defineProps({
  disabled: {
    type: Boolean,
    default: false,
  },
  idPrefix: {
    type: String,
    default: 'exercise-picker',
  },
})

const emit = defineEmits(['add'])

const exercises = ref([])
const loading = ref(false)
const loadError = ref('')
const search = ref('')
const selectedId = ref('')

async function loadExercises() {
  loading.value = true
  loadError.value = ''
  try {
    exercises.value = await fetchAllExercises()
  } catch {
    loadError.value = 'No pudimos cargar la biblioteca de ejercicios. Intenta de nuevo.'
    exercises.value = []
  } finally {
    loading.value = false
  }
}

const filtered = computed(() => {
  const term = search.value.trim().toLowerCase()
  if (!term) return exercises.value
  return exercises.value.filter((exercise) => exercise.name?.toLowerCase().includes(term))
})

const options = computed(() =>
  filtered.value.map((exercise) => ({
    value: exercise.id,
    label: exercise.muscle_group
      ? `${exercise.name} · ${exercise.muscle_group}`
      : exercise.name,
  })),
)

const selectedExercise = computed(
  () => exercises.value.find((exercise) => exercise.id === selectedId.value) ?? null,
)

function handleAdd() {
  if (!selectedExercise.value) return
  emit('add', selectedExercise.value)
  selectedId.value = ''
  search.value = ''
}

onMounted(loadExercises)
</script>

<template>
  <div class="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-4">
    <p v-if="loadError" class="mb-3 text-sm text-red-700" role="alert">
      {{ loadError }}
      <BaseButton class="ml-2" type="button" variant="ghost" @click="loadExercises">
        Reintentar
      </BaseButton>
    </p>

    <div class="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <BaseInput
        :id="`${idPrefix}-search`"
        v-model="search"
        label="Buscar ejercicio"
        type="search"
        placeholder="Nombre del ejercicio"
        :disabled="disabled || loading"
      />
      <BaseSelect
        :id="`${idPrefix}-select`"
        v-model="selectedId"
        label="Ejercicio"
        :options="options"
        :placeholder="loading ? 'Cargando…' : 'Selecciona un ejercicio'"
        :disabled="disabled || loading"
      />
      <BaseButton
        type="button"
        :disabled="disabled || loading || !selectedExercise"
        @click="handleAdd"
      >
        Añadir ejercicio
      </BaseButton>
    </div>
  </div>
</template>
