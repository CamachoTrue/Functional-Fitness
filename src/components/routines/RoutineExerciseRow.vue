<script setup>
import { reactive, watch } from 'vue'

import BaseButton from '../common/BaseButton.vue'
import BaseInput from '../common/BaseInput.vue'

/**
 * Fila editable de un ejercicio dentro de un día de rutina. Muestra el nombre
 * del ejercicio (snapshot embebido) y los campos prescriptivos
 * (sets/reps/rest_seconds/tempo/notes) con Base*. Botones ↑/↓ para reordenar y
 * eliminar. Los cambios de campos se emiten al perder el foco (`update`) para no
 * disparar una escritura por tecla. Solo usa componentes base.
 */
const props = defineProps({
  exercise: {
    type: Object,
    required: true,
  },
  isFirst: {
    type: Boolean,
    default: false,
  },
  isLast: {
    type: Boolean,
    default: false,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update', 'move-up', 'move-down', 'remove'])

// Estado local editable, inicializado desde la fila y re-sincronizado si la
// prop cambia (p. ej. tras recargar por un reorder).
const form = reactive({
  sets: '',
  reps: '',
  rest_seconds: '',
  tempo: '',
  notes: '',
})

function syncFromProp() {
  form.sets = props.exercise.sets ?? ''
  form.reps = props.exercise.reps ?? ''
  form.rest_seconds = props.exercise.rest_seconds ?? ''
  form.tempo = props.exercise.tempo ?? ''
  form.notes = props.exercise.notes ?? ''
}

watch(() => props.exercise.id, syncFromProp, { immediate: true })

/**
 * Emite el update de un campo normalizando vacíos a null. rest_seconds se
 * castea a entero (>= 0) o null si no es un número válido.
 * @param {string} field
 */
function commit(field) {
  let value = form[field]
  if (typeof value === 'string') value = value.trim()

  if (field === 'rest_seconds') {
    const parsed = value === '' ? null : Number.parseInt(value, 10)
    value = Number.isFinite(parsed) && parsed >= 0 ? parsed : null
    form.rest_seconds = value ?? ''
  } else {
    value = value === '' ? null : value
  }

  emit('update', { [field]: value })
}

function exerciseLabel() {
  return props.exercise.exercises?.name ?? 'Ejercicio'
}
</script>

<template>
  <div class="rounded-lg border border-neutral-200 bg-white p-4">
    <div class="flex items-start justify-between gap-3">
      <div>
        <p class="font-semibold text-neutral-900">{{ exerciseLabel() }}</p>
        <p v-if="exercise.exercises?.muscle_group" class="text-xs text-neutral-500">
          {{ exercise.exercises.muscle_group }}
        </p>
      </div>
      <div class="flex items-center gap-1.5">
        <BaseButton
          type="button"
          variant="ghost"
          :disabled="disabled || isFirst"
          aria-label="Subir ejercicio"
          @click="emit('move-up')"
        >
          ↑
        </BaseButton>
        <BaseButton
          type="button"
          variant="ghost"
          :disabled="disabled || isLast"
          aria-label="Bajar ejercicio"
          @click="emit('move-down')"
        >
          ↓
        </BaseButton>
        <BaseButton
          type="button"
          variant="secondary"
          :disabled="disabled"
          @click="emit('remove')"
        >
          Eliminar
        </BaseButton>
      </div>
    </div>

    <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <BaseInput
        :id="`ex-${exercise.id}-sets`"
        v-model="form.sets"
        label="Series"
        placeholder="Ej. 4"
        :disabled="disabled"
        @blur="commit('sets')"
      />
      <BaseInput
        :id="`ex-${exercise.id}-reps`"
        v-model="form.reps"
        label="Repeticiones"
        placeholder="Ej. 8-10"
        :disabled="disabled"
        @blur="commit('reps')"
      />
      <BaseInput
        :id="`ex-${exercise.id}-rest`"
        v-model="form.rest_seconds"
        label="Descanso (seg)"
        type="number"
        min="0"
        placeholder="Ej. 90"
        :disabled="disabled"
        @blur="commit('rest_seconds')"
      />
      <BaseInput
        :id="`ex-${exercise.id}-tempo`"
        v-model="form.tempo"
        label="Tempo"
        placeholder="Ej. 3-1-1"
        :disabled="disabled"
        @blur="commit('tempo')"
      />
    </div>

    <div class="mt-3">
      <BaseInput
        :id="`ex-${exercise.id}-notes`"
        v-model="form.notes"
        label="Notas"
        placeholder="Indicaciones para este ejercicio"
        :disabled="disabled"
        @blur="commit('notes')"
      />
    </div>
  </div>
</template>
