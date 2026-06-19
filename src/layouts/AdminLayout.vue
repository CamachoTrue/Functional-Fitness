<script setup>
import { RouterView } from 'vue-router'

import DashboardSidebar from '../components/layout/DashboardSidebar.vue'

const navigation = [{ label: 'Dashboard', to: '/admin/dashboard' }]
</script>

<template>
  <div class="min-h-screen bg-surface-muted lg:grid lg:grid-cols-[17rem_1fr]">
    <DashboardSidebar eyebrow="Administración" :navigation="navigation" />
    <main class="min-w-0 p-5 sm:p-8 lg:p-10">
      <RouterView />
    </main>
  </div>
</template>
