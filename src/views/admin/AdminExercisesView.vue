<script setup>
import { onMounted } from 'vue'
import { RouterLink } from 'vue-router'

import BaseButton from '../../components/common/BaseButton.vue'
import LoadingSpinner from '../../components/common/LoadingSpinner.vue'
import ExerciseTable from '../../components/exercises/ExerciseTable.vue'
import { useExercisesAdmin } from '../../composables/useExercisesAdmin'

const { exercises, loading, error, saving, load, remove } = useExercisesAdmin()

async function handleDelete(exercise) {
  try {
    await remove(exercise.id, exercise.video_path ?? null)
  } catch {
    // El composable expone el mensaje (p. ej. "en uso") en `error`, que la tabla muestra.
  }
}

onMounted(load)
</script>

<template>
  <div class="mx-auto max-w-6xl">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p class="text-sm font-bold text-brand-green">BIBLIOTECA</p>
        <h1 class="mt-2 text-3xl font-black tracking-tight">Ejercicios</h1>
        <p class="mt-2 text-sm text-neutral-600">
          Administra los ejercicios y sus videos demostrativos.
        </p>
      </div>
      <RouterLink :to="{ name: 'admin-exercise-create' }">
        <BaseButton type="button">Nuevo ejercicio</BaseButton>
      </RouterLink>
    </div>

    <div class="mt-8">
      <LoadingSpinner v-if="loading" label="Cargando ejercicios" />

      <div v-else-if="error && exercises.length === 0" class="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <p class="text-sm text-red-700" role="alert">{{ error }}</p>
        <BaseButton class="mt-4" type="button" variant="secondary" @click="load">
          Recargar
        </BaseButton>
      </div>

      <ExerciseTable
        v-else
        :exercises="exercises"
        :saving="saving"
        :delete-error="error ?? ''"
        @delete="handleDelete"
      />
    </div>
  </div>
</template>
