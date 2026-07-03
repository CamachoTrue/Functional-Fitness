<script setup>
import BaseCard from '../common/BaseCard.vue'
import ClientExerciseCard from './ClientExerciseCard.vue'

/**
 * Bloque de solo lectura de un día de la rutina del cliente: título del día,
 * notas y la lista de ejercicios (ClientExerciseCard). Recibe getVideoUrl para
 * pasarlo a cada ejercicio, de modo que la firma del video sea on-demand.
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
  getVideoUrl: {
    type: Function,
    required: true,
  },
})
</script>

<template>
  <BaseCard>
    <div class="flex flex-wrap items-baseline justify-between gap-2">
      <div>
        <p class="text-sm font-bold text-brand-green">DÍA {{ position }}</p>
        <h2 class="mt-1 text-xl font-black tracking-tight">
          {{ day.title || `Día ${position}` }}
        </h2>
      </div>
    </div>

    <p v-if="day.notes" class="mt-3 whitespace-pre-line text-sm leading-6 text-muted">
      {{ day.notes }}
    </p>

    <div v-if="day.routine_exercises?.length" class="mt-5 space-y-4">
      <ClientExerciseCard
        v-for="exercise in day.routine_exercises"
        :key="exercise.id"
        :exercise="exercise"
        :get-video-url="props.getVideoUrl"
      />
    </div>
    <p v-else class="mt-5 text-sm text-faint">Este día aún no tiene ejercicios.</p>
  </BaseCard>
</template>
