<script setup>
import { reactive, ref, watch } from 'vue'

import BaseButton from '../common/BaseButton.vue'
import BaseCard from '../common/BaseCard.vue'
import BaseInput from '../common/BaseInput.vue'
import BaseTextarea from '../common/BaseTextarea.vue'
import RoutineDayCard from './RoutineDayCard.vue'

/**
 * Editor completo de una rutina: metadatos (name/objective/general_notes) y la
 * lista ordenada de días, cada uno con sus ejercicios (RoutineDayCard). No
 * accede al service: recibe la rutina y `saving` por props y eleva todas las
 * mutaciones al composable (useRoutineBuilder) vía eventos. Solo usa componentes
 * base + subcomponentes de rutinas.
 */
const props = defineProps({
  routine: {
    type: Object,
    required: true,
  },
  saving: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits([
  'update-meta',
  'add-day',
  'update-day',
  'move-day',
  'remove-day',
  'add-exercise',
  'update-exercise',
  'move-exercise',
  'remove-exercise',
])

const meta = reactive({ name: '', objective: '', general_notes: '' })

function syncMeta() {
  meta.name = props.routine.name ?? ''
  meta.objective = props.routine.objective ?? ''
  meta.general_notes = props.routine.general_notes ?? ''
}

watch(() => props.routine.id, syncMeta, { immediate: true })

function commitName() {
  const value = meta.name.trim()
  if (!value || value === (props.routine.name ?? '')) return
  emit('update-meta', { name: value })
}

function commitObjective() {
  const value = meta.objective.trim()
  const current = props.routine.objective ?? ''
  if (value === current) return
  emit('update-meta', { objective: value === '' ? null : value })
}

function commitGeneralNotes() {
  const value = meta.general_notes.trim()
  const current = props.routine.general_notes ?? ''
  if (value === current) return
  emit('update-meta', { general_notes: value === '' ? null : value })
}

// Formulario de "nuevo día" (título obligatorio, notas opcionales).
const newDayTitle = ref('')

function handleAddDay() {
  const title = newDayTitle.value.trim()
  if (!title) return
  emit('add-day', { title })
  newDayTitle.value = ''
}
</script>

<template>
  <div class="space-y-6">
    <BaseCard>
      <h2 class="text-lg font-bold">Detalles de la rutina</h2>
      <div class="mt-4 grid gap-4">
        <BaseInput
          id="routine-name"
          v-model="meta.name"
          label="Nombre de la rutina"
          placeholder="Ej. Fuerza general - 4 días"
          :disabled="saving"
          @blur="commitName"
        />
        <BaseInput
          id="routine-objective"
          v-model="meta.objective"
          label="Objetivo"
          placeholder="Ej. Ganancia de fuerza"
          :disabled="saving"
          @blur="commitObjective"
        />
        <BaseTextarea
          id="routine-general-notes"
          v-model="meta.general_notes"
          label="Notas generales"
          :rows="3"
          placeholder="Indicaciones para toda la rutina (opcional)"
          :disabled="saving"
          @blur="commitGeneralNotes"
        />
      </div>
    </BaseCard>

    <section>
      <div class="flex flex-wrap items-end justify-between gap-4">
        <h2 class="text-lg font-bold">Días de entrenamiento</h2>
      </div>

      <div v-if="routine.routine_days?.length" class="mt-4 space-y-5">
        <RoutineDayCard
          v-for="(day, index) in routine.routine_days"
          :key="day.id"
          :day="day"
          :position="index + 1"
          :is-first="index === 0"
          :is-last="index === routine.routine_days.length - 1"
          :disabled="saving"
          @update-day="emit('update-day', { dayId: day.id, fields: $event })"
          @move-day-up="emit('move-day', { dayId: day.id, direction: 'up' })"
          @move-day-down="emit('move-day', { dayId: day.id, direction: 'down' })"
          @remove-day="emit('remove-day', day.id)"
          @add-exercise="emit('add-exercise', { dayId: day.id, exercise: $event })"
          @update-exercise="
            emit('update-exercise', {
              dayId: day.id,
              exerciseRowId: $event.exerciseRowId,
              fields: $event.fields,
            })
          "
          @move-exercise-up="emit('move-exercise', { dayId: day.id, exerciseRowId: $event, direction: 'up' })"
          @move-exercise-down="emit('move-exercise', { dayId: day.id, exerciseRowId: $event, direction: 'down' })"
          @remove-exercise="emit('remove-exercise', { dayId: day.id, exerciseRowId: $event })"
        />
      </div>
      <p v-else class="mt-4 text-sm text-faint">
        Esta rutina aún no tiene días. Añade el primero abajo.
      </p>

      <BaseCard class="mt-5">
        <div class="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <BaseInput
            id="new-day-title"
            v-model="newDayTitle"
            label="Añadir día"
            placeholder="Título del nuevo día (ej. Tren inferior)"
            :disabled="saving"
            @keyup.enter="handleAddDay"
          />
          <BaseButton type="button" :disabled="saving || !newDayTitle.trim()" @click="handleAddDay">
            Añadir día
          </BaseButton>
        </div>
      </BaseCard>
    </section>
  </div>
</template>
