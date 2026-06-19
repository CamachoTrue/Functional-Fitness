<script setup>
import BaseCard from '../../components/common/BaseCard.vue'
</script>

<template>
  <div class="mx-auto max-w-6xl">
    <p class="text-sm font-bold text-brand-green">CONTROL GENERAL</p>
    <h1 class="mt-2 text-3xl font-black tracking-tight">Dashboard</h1>
    <div class="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <BaseCard v-for="label in ['Ventas del mes', 'Clientes activos', 'Compras pendientes', 'Rutinas pendientes']" :key="label">
        <p class="text-sm text-neutral-600">{{ label }}</p>
        <p class="mt-3 text-3xl font-black">—</p>
      </BaseCard>
    </div>
  </div>
</template>
