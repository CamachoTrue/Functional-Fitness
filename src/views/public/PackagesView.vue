<script setup>
import EmptyState from '../../components/common/EmptyState.vue'
</script>

<template>
  <section class="py-16 sm:py-24">
    <div class="page-container">
      <p class="text-sm font-bold text-brand-green">PAQUETES</p>
      <h1 class="mt-3 text-4xl font-black tracking-tight">Elige cómo quieres entrenar.</h1>
      <p class="mt-4 max-w-2xl leading-7 text-neutral-600">
        Aquí aparecerán los planes disponibles cuando se conecte el catálogo con Supabase.
      </p>
      <div class="mt-10">
        <EmptyState
          title="Catálogo en preparación"
          description="La estructura visual está lista. Los paquetes se incorporarán en la fase de datos."
        />
      </div>
    </div>
  </section>
</template>
