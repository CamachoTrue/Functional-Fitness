<script setup>
import { RouterLink } from 'vue-router'

defineProps({
  id: {
    type: String,
    required: true,
  },
})
</script>

<template>
  <section class="py-16 sm:py-24">
    <div class="page-container max-w-3xl">
      <p class="text-sm font-bold text-brand-green">DETALLE DEL PAQUETE</p>
      <h1 class="mt-3 text-4xl font-black tracking-tight">Paquete {{ id }}</h1>
      <p class="mt-4 leading-7 text-neutral-600">
        Esta vista cargará la información real del paquete cuando se conecte Supabase.
      </p>
      <RouterLink class="focus-ring mt-8 inline-block rounded-sm text-sm font-semibold underline" to="/packages">
        Volver a paquetes
      </RouterLink>
    </div>
  </section>
</template>
