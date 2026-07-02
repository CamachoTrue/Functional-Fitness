<script setup>
import { onMounted } from 'vue'
import { RouterLink } from 'vue-router'

import BaseButton from '../../components/common/BaseButton.vue'
import LoadingSpinner from '../../components/common/LoadingSpinner.vue'
import RoutineTable from '../../components/routines/RoutineTable.vue'
import { useAdminRoutines } from '../../composables/useAdminRoutines'

const { routines, loading, error, load } = useAdminRoutines()

onMounted(load)
</script>

<template>
  <div class="mx-auto max-w-6xl">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p class="text-sm font-bold text-brand-green">ENTRENAMIENTO</p>
        <h1 class="mt-2 text-3xl font-black tracking-tight">Rutinas</h1>
        <p class="mt-2 text-sm text-neutral-600">
          Construye y asigna las rutinas de tus clientes.
        </p>
      </div>
      <RouterLink :to="{ name: 'admin-routine-create' }">
        <BaseButton type="button">Nueva rutina</BaseButton>
      </RouterLink>
    </div>

    <div class="mt-8">
      <LoadingSpinner v-if="loading" label="Cargando rutinas" />

      <div
        v-else-if="error"
        class="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm"
      >
        <p class="text-sm text-red-700" role="alert">{{ error }}</p>
        <BaseButton class="mt-4" type="button" variant="secondary" @click="load">
          Recargar
        </BaseButton>
      </div>

      <RoutineTable v-else :routines="routines" />
    </div>
  </div>
</template>
