<script setup>
import { RouterView } from 'vue-router'

import DashboardSidebar from '../components/layout/DashboardSidebar.vue'

const navigation = [
  { label: 'Resumen', to: '/client/dashboard' },
  { label: 'Mi rutina', to: '/client/routine' },
  { label: 'Mi evaluación', to: '/client/purchases' },
]
</script>

<template>
  <div class="min-h-screen bg-surface-muted lg:grid lg:grid-cols-[17rem_1fr]">
    <a
      href="#main"
      class="focus-ring sr-only rounded-md bg-surface-inverse px-4 py-2 text-sm font-semibold text-on-inverse focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50"
    >
      Saltar al contenido
    </a>
    <DashboardSidebar eyebrow="Área de cliente" :navigation="navigation" />
    <main id="main" class="min-w-0 p-5 sm:p-8 lg:p-10">
      <RouterView />
    </main>
  </div>
</template>
