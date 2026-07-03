<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <section class="bg-surface-inverse py-18 text-on-inverse sm:py-24">
    <div class="page-container">
      <h2 class="max-w-2xl text-3xl font-black tracking-tight sm:text-4xl">¿Listo para empezar?</h2>
      <p class="mt-4 max-w-2xl text-base leading-7 text-neutral-300">
        Da el primer paso hoy y entrena con un plan diseñado para tu nivel y tus objetivos.
      </p>
      <div class="mt-8 flex flex-col gap-3 sm:flex-row">
        <RouterLink
          class="focus-ring inline-flex min-h-12 items-center justify-center rounded-md bg-brand-green px-6 font-semibold text-black transition hover:brightness-95"
          to="/register"
        >
          Quiero comenzar
        </RouterLink>
        <RouterLink
          class="focus-ring inline-flex min-h-12 items-center justify-center rounded-md border border-neutral-700 px-6 font-semibold transition hover:border-neutral-500 hover:bg-neutral-900"
          to="/packages"
        >
          Ver paquetes
        </RouterLink>
      </div>
    </div>
  </section>
</template>
