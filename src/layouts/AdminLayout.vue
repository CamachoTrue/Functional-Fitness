<script setup>
import { RouterView } from 'vue-router'

import DashboardSidebar from '../components/layout/DashboardSidebar.vue'

const navigation = [
  { label: 'Dashboard', to: '/admin/dashboard' },
  { label: 'Clientes', to: '/admin/clients' },
  { label: 'Compras', to: '/admin/purchases' },
  { label: 'Cuestionarios', to: '/admin/questionnaires' },
  { label: 'Rutinas', to: '/admin/routines' },
  { label: 'Paquetes', to: '/admin/packages' },
  { label: 'Ejercicios', to: '/admin/exercises' },
]
</script>

<template>
  <div class="min-h-screen bg-surface-muted lg:grid lg:grid-cols-[17rem_1fr]">
    <a
      href="#main"
      class="focus-ring sr-only rounded-md bg-black px-4 py-2 text-sm font-semibold text-white focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50"
    >
      Saltar al contenido
    </a>
    <DashboardSidebar eyebrow="Administración" :navigation="navigation" />
    <main id="main" class="min-w-0 p-5 sm:p-8 lg:p-10">
      <RouterView />
    </main>
  </div>
</template>
