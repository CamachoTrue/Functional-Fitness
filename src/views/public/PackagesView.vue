<script setup>
import { onMounted } from 'vue'

import EmptyState from '../../components/common/EmptyState.vue'
import LoadingSpinner from '../../components/common/LoadingSpinner.vue'
import PackageCard from '../../components/packages/PackageCard.vue'
import { usePackages } from '../../composables/usePackages'

const { packages, loading, error, load } = usePackages()

onMounted(load)
</script>

<template>
  <section class="py-16 sm:py-24">
    <div class="page-container">
      <p class="text-sm font-bold text-brand-green">PAQUETES</p>
      <h1 class="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Elige cómo quieres entrenar.</h1>
      <p class="mt-4 max-w-2xl leading-7 text-muted">
        Planes de functional fitness pensados para acompañarte según tu nivel y tus objetivos.
      </p>

      <div class="mt-10">
        <LoadingSpinner v-if="loading" label="Cargando paquetes" />

        <EmptyState
          v-else-if="error"
          title="Ocurrió un problema"
          :description="error"
        />

        <div
          v-else-if="packages.length"
          class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          <PackageCard v-for="pkg in packages" :key="pkg.id" :pkg="pkg" />
        </div>

        <EmptyState
          v-else
          title="Sin paquetes"
          description="No hay paquetes disponibles por ahora."
        />
      </div>
    </div>
  </section>
</template>
