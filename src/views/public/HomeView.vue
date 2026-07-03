<script setup>
import { RouterLink } from 'vue-router'

import CtaSection from '../../components/public/CtaSection.vue'
import FaqSection from '../../components/public/FaqSection.vue'
import TestimonialsSection from '../../components/public/TestimonialsSection.vue'
</script>

<template>
  <section class="bg-surface-inverse py-20 text-on-inverse sm:py-28 lg:py-36">
    <div class="page-container">
      <p class="text-sm font-bold tracking-[0.18em] text-brand-green uppercase">Entrenamiento online</p>
      <h1 class="mt-5 max-w-4xl text-4xl leading-tight font-black tracking-tight sm:text-6xl">
        Entrena con un plan diseñado para ti.
      </h1>
      <p class="mt-6 max-w-2xl text-base leading-7 text-neutral-300 sm:text-lg">
        Rutinas personalizadas de functional fitness según tu nivel, objetivos y equipo disponible.
      </p>
      <div class="mt-9 flex flex-col gap-3 sm:flex-row">
        <RouterLink
          class="focus-ring inline-flex min-h-12 items-center justify-center rounded-md bg-white px-6 font-semibold text-black transition hover:bg-neutral-200"
          to="/packages"
        >
          Ver paquetes
        </RouterLink>
        <RouterLink
          class="focus-ring inline-flex min-h-12 items-center justify-center rounded-md border border-neutral-700 px-6 font-semibold transition hover:border-neutral-500 hover:bg-neutral-900"
          to="/register"
        >
          Quiero comenzar
        </RouterLink>
      </div>
    </div>
  </section>

  <section class="py-18 sm:py-24">
    <div class="page-container grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
      <div>
        <p class="text-sm font-bold text-brand-green">UNA BASE CLARA</p>
        <h2 class="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Todo lo necesario para avanzar.</h2>
      </div>
      <div class="grid gap-px overflow-hidden rounded-xl border border-border-subtle bg-border-subtle sm:grid-cols-3">
        <div class="bg-surface-raised p-6">
          <strong class="text-lg">Personalizado</strong>
          <p class="mt-2 text-sm leading-6 text-muted">Un plan alineado con tu objetivo y experiencia.</p>
        </div>
        <div class="bg-surface-raised p-6">
          <strong class="text-lg">Visual</strong>
          <p class="mt-2 text-sm leading-6 text-muted">Videos de referencia para cada ejercicio.</p>
        </div>
        <div class="bg-surface-raised p-6">
          <strong class="text-lg">Organizado</strong>
          <p class="mt-2 text-sm leading-6 text-muted">Sesiones claras, ordenadas por día.</p>
        </div>
      </div>
    </div>
  </section>

  <TestimonialsSection />
  <FaqSection />
  <CtaSection />
</template>
