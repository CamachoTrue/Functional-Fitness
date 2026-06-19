<script setup>
import EmptyState from '../../components/common/EmptyState.vue'
</script>

<template>
  <div class="mx-auto max-w-6xl">
    <p class="text-sm font-bold text-brand-green">TU ENTRENAMIENTO</p>
    <h1 class="mt-2 text-3xl font-black tracking-tight">Resumen</h1>
    <div class="mt-8">
      <EmptyState
        title="Tu plan aparecerá aquí"
        description="Este espacio mostrará el estado de tu compra, cuestionario y rutina asignada."
      />
    </div>
  </div>
</template>
