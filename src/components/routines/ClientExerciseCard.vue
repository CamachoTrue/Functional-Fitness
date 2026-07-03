<script setup>
import { ref } from 'vue'

import BaseBadge from '../common/BaseBadge.vue'
import BaseButton from '../common/BaseButton.vue'
import BaseCard from '../common/BaseCard.vue'

/**
 * Tarjeta de solo lectura de un ejercicio de la rutina del cliente. Muestra el
 * nombre, la ficha (grupo muscular / nivel), la prescripción
 * (series/reps/descanso/tempo) y las notas del entrenador. El video se firma
 * ON-DEMAND al pulsar "Ver video" mediante getVideoUrl (inyectado por prop): así
 * la URL firmada del bucket privado solo se genera al reproducir.
 *
 * REGLAS DE DOMINIO:
 * - Si el ejercicio no tiene video (video_path null) se muestra el estado "Sin
 *   video" y no se ofrece reproducción.
 * - Si la firma falla (policy denegada / error de red) se muestra "Video no
 *   disponible" sin romper el resto de la tarjeta.
 */
const props = defineProps({
  exercise: {
    type: Object,
    required: true,
  },
  // (path) => Promise<string|null>. Devuelve la signed URL o null (sin video /
  // error de firma). No debe lanzar.
  getVideoUrl: {
    type: Function,
    required: true,
  },
})

const videoUrl = ref(null)
const loadingVideo = ref(false)
const videoError = ref(false)

async function playVideo() {
  if (loadingVideo.value) return
  videoError.value = false
  loadingVideo.value = true
  try {
    const url = await props.getVideoUrl(props.exercise.exercises?.video_path)
    if (url) {
      videoUrl.value = url
    } else {
      videoError.value = true
    }
  } catch {
    videoError.value = true
  } finally {
    loadingVideo.value = false
  }
}
</script>

<template>
  <BaseCard>
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="font-semibold text-body">
          {{ exercise.exercises?.name ?? 'Ejercicio' }}
        </p>
        <div class="mt-1 flex flex-wrap items-center gap-2">
          <BaseBadge v-if="exercise.exercises?.muscle_group">
            {{ exercise.exercises.muscle_group }}
          </BaseBadge>
          <BaseBadge v-if="exercise.exercises?.level">
            {{ exercise.exercises.level }}
          </BaseBadge>
        </div>
      </div>
    </div>

    <dl class="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
      <div>
        <dt class="text-xs font-semibold uppercase tracking-wide text-faint">Series</dt>
        <dd class="mt-0.5 font-medium text-body">{{ exercise.sets || '—' }}</dd>
      </div>
      <div>
        <dt class="text-xs font-semibold uppercase tracking-wide text-faint">Repeticiones</dt>
        <dd class="mt-0.5 font-medium text-body">{{ exercise.reps || '—' }}</dd>
      </div>
      <div>
        <dt class="text-xs font-semibold uppercase tracking-wide text-faint">Descanso</dt>
        <dd class="mt-0.5 font-medium text-body">
          {{ exercise.rest_seconds != null ? `${exercise.rest_seconds}s` : '—' }}
        </dd>
      </div>
      <div>
        <dt class="text-xs font-semibold uppercase tracking-wide text-faint">Tempo</dt>
        <dd class="mt-0.5 font-medium text-body">{{ exercise.tempo || '—' }}</dd>
      </div>
    </dl>

    <div v-if="exercise.exercises?.description" class="mt-4">
      <p class="text-xs font-semibold uppercase tracking-wide text-faint">Cómo se hace</p>
      <p class="mt-1 whitespace-pre-line text-sm leading-6 text-muted">
        {{ exercise.exercises.description }}
      </p>
    </div>

    <div v-if="exercise.exercises?.common_mistakes" class="mt-4">
      <p class="text-xs font-semibold uppercase tracking-wide text-faint">Errores comunes</p>
      <p class="mt-1 whitespace-pre-line text-sm leading-6 text-muted">
        {{ exercise.exercises.common_mistakes }}
      </p>
    </div>

    <div v-if="exercise.notes" class="mt-4 rounded-lg bg-surface-muted p-3">
      <p class="text-xs font-semibold uppercase tracking-wide text-faint">
        Notas del entrenador
      </p>
      <p class="mt-1 whitespace-pre-line text-sm leading-6 text-muted">
        {{ exercise.notes }}
      </p>
    </div>

    <div class="mt-5">
      <video
        v-if="videoUrl"
        class="w-full rounded-lg bg-black"
        controls
        :src="videoUrl"
      />

      <p v-else-if="!exercise.exercises?.video_path" class="text-sm text-faint">
        Sin video
      </p>

      <p v-else-if="videoError" class="text-sm text-danger" role="alert">Video no disponible</p>

      <BaseButton
        v-else
        type="button"
        variant="secondary"
        :disabled="loadingVideo"
        @click="playVideo"
      >
        {{ loadingVideo ? 'Cargando…' : 'Ver video' }}
      </BaseButton>
    </div>
  </BaseCard>
</template>
