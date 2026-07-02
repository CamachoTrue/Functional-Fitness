<script setup>
import { reactive, watch } from 'vue'

import BaseButton from '../common/BaseButton.vue'
import BaseCard from '../common/BaseCard.vue'
import BaseInput from '../common/BaseInput.vue'
import BaseTextarea from '../common/BaseTextarea.vue'
import ExercisePicker from './ExercisePicker.vue'
import RoutineExerciseRow from './RoutineExerciseRow.vue'

/**
 * Tarjeta de un día de rutina. Edita title/notes del día (commit al perder el
 * foco), permite reordenarlo (↑/↓) y eliminarlo, y gestiona sus ejercicios: un
 * ExercisePicker para añadir y una lista ordenada de RoutineExerciseRow con sus
 * propios controles de orden/edición/eliminación. Todos los eventos se elevan al
 * RoutineBuilder. Solo usa componentes base.
 */
const props = defineProps({
  day: {
    type: Object,
    required: true,
  },
  position: {
    type: Number,
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

const emit = defineEmits([
  'update-day',
  'move-day-up',
  'move-day-down',
  'remove-day',
  'add-exercise',
  'update-exercise',
  'move-exercise-up',
  'move-exercise-down',
  'remove-exercise',
])

const form = reactive({ title: '', notes: '' })

function syncFromProp() {
  form.title = props.day.title ?? ''
  form.notes = props.day.notes ?? ''
}

watch(() => props.day.id, syncFromProp, { immediate: true })

function commitTitle() {
  const value = form.title.trim()
  if (value === (props.day.title ?? '')) return
  emit('update-day', { title: value })
}

function commitNotes() {
  const value = form.notes.trim()
  const current = props.day.notes ?? ''
  if (value === current) return
  emit('update-day', { notes: value === '' ? null : value })
}

function confirmRemoveDay() {
  const ok = window.confirm(
    `¿Eliminar el día "${props.day.title || `Día ${props.position}`}" y todos sus ejercicios?`,
  )
  if (ok) emit('remove-day')
}

function confirmRemoveExercise(exercise) {
  const name = exercise.exercises?.name ?? 'este ejercicio'
  const ok = window.confirm(`¿Quitar ${name} del día?`)
  if (ok) emit('remove-exercise', exercise.id)
}
</script>

<template>
  <BaseCard>
    <div class="flex items-start justify-between gap-3">
      <p class="text-sm font-bold text-brand-green">DÍA {{ position }}</p>
      <div class="flex items-center gap-1.5">
        <BaseButton
          type="button"
          variant="ghost"
          :disabled="disabled || isFirst"
          aria-label="Subir día"
          @click="emit('move-day-up')"
        >
          ↑
        </BaseButton>
        <BaseButton
          type="button"
          variant="ghost"
          :disabled="disabled || isLast"
          aria-label="Bajar día"
          @click="emit('move-day-down')"
        >
          ↓
        </BaseButton>
        <BaseButton
          type="button"
          variant="secondary"
          :disabled="disabled"
          @click="confirmRemoveDay"
        >
          Eliminar día
        </BaseButton>
      </div>
    </div>

    <div class="mt-4 grid gap-3">
      <BaseInput
        :id="`day-${day.id}-title`"
        v-model="form.title"
        label="Título del día"
        placeholder="Ej. Tren superior"
        :disabled="disabled"
        @blur="commitTitle"
      />
      <BaseTextarea
        :id="`day-${day.id}-notes`"
        v-model="form.notes"
        label="Notas del día"
        :rows="2"
        placeholder="Indicaciones generales para el día (opcional)"
        :disabled="disabled"
        @blur="commitNotes"
      />
    </div>

    <div class="mt-6">
      <h4 class="text-sm font-semibold text-neutral-800">Ejercicios</h4>

      <div v-if="day.routine_exercises?.length" class="mt-3 space-y-3">
        <RoutineExerciseRow
          v-for="(exercise, index) in day.routine_exercises"
          :key="exercise.id"
          :exercise="exercise"
          :is-first="index === 0"
          :is-last="index === day.routine_exercises.length - 1"
          :disabled="disabled"
          @update="emit('update-exercise', { exerciseRowId: exercise.id, fields: $event })"
          @move-up="emit('move-exercise-up', exercise.id)"
          @move-down="emit('move-exercise-down', exercise.id)"
          @remove="confirmRemoveExercise(exercise)"
        />
      </div>
      <p v-else class="mt-3 text-sm text-neutral-500">
        Este día aún no tiene ejercicios. Añade uno desde la biblioteca.
      </p>

      <div class="mt-4">
        <ExercisePicker
          :id-prefix="`day-${day.id}-picker`"
          :disabled="disabled"
          @add="emit('add-exercise', $event)"
        />
      </div>
    </div>
  </BaseCard>
</template>
