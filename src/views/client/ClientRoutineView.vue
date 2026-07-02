<script setup>
import { onMounted } from 'vue'

import BaseButton from '../../components/common/BaseButton.vue'
import EmptyState from '../../components/common/EmptyState.vue'
import LoadingSpinner from '../../components/common/LoadingSpinner.vue'
import ClientRoutineDay from '../../components/routines/ClientRoutineDay.vue'
import { useClientRoutine } from '../../composables/useClientRoutine'

// Sin :routineId: el composable resuelve la rutina assigned vigente del usuario
// (la RLS limita a la del propio cliente con compra vigente no vencida).
const { routine, loading, error, load, getVideoUrl } = useClientRoutine()

onMounted(load)
</script>

<template>
  <div class="mx-auto max-w-4xl">
    <p class="text-sm font-bold text-brand-green">TU ENTRENAMIENTO</p>
    <h1 class="mt-2 text-3xl font-black tracking-tight">Mi rutina</h1>

    <div class="mt-8">
      <LoadingSpinner v-if="loading" label="Cargando tu rutina" />

      <div v-else-if="error" class="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <p class="text-sm text-red-700" role="alert">{{ error }}</p>
        <BaseButton class="mt-4" type="button" variant="secondary" @click="load">
          Recargar
        </BaseButton>
      </div>

      <EmptyState
        v-else-if="!routine"
        title="Tu rutina aún está en preparación"
        description="En cuanto tu entrenador la publique, aparecerá aquí con todos tus ejercicios."
      />

      <div v-else>
        <header v-if="routine.objective || routine.general_notes">
          <p v-if="routine.objective" class="text-base font-semibold text-neutral-900">
            {{ routine.objective }}
          </p>
          <p
            v-if="routine.general_notes"
            class="mt-2 whitespace-pre-line text-sm leading-6 text-neutral-700"
          >
            {{ routine.general_notes }}
          </p>
        </header>

        <div class="mt-6 space-y-6">
          <ClientRoutineDay
            v-for="(day, index) in routine.routine_days"
            :key="day.id"
            :day="day"
            :position="index + 1"
            :get-video-url="getVideoUrl"
          />
        </div>

        <EmptyState
          v-if="!routine.routine_days?.length"
          title="Tu rutina aún está en preparación"
          description="Tu entrenador todavía no ha añadido días de entrenamiento."
        />
      </div>
    </div>
  </div>
</template>
