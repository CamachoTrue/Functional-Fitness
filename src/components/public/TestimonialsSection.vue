<script setup>
import BaseCard from '../common/BaseCard.vue'

// TODO: reemplazar por testimonios reales.
const testimonials = [
  {
    name: 'Ana Ramírez',
    role: 'Entrena desde casa',
    quote:
      'Nunca había seguido una rutina tan clara. Saber exactamente qué hacer cada día me quitó toda la incertidumbre.',
  },
  {
    name: 'Carlos Méndez',
    role: 'Nivel intermedio',
    quote:
      'Los videos de cada ejercicio me ayudaron a corregir la técnica. Me sentí acompañado en todo el proceso.',
  },
  {
    name: 'Lucía Torres',
    role: 'Retomando el entrenamiento',
    quote:
      'El plan se adaptó a mi equipo y a mi tiempo. Por fin logré ser constante y ver progreso real.',
  },
]

function initials(name) {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}
</script>

<template>
  <section class="py-18 sm:py-24">
    <div class="page-container">
      <p class="text-sm font-bold text-brand-blue">LO QUE DICEN</p>
      <h2 class="mt-3 text-3xl font-black tracking-tight uppercase sm:text-4xl">Historias de quienes entrenan.</h2>

      <div class="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <BaseCard v-for="testimonial in testimonials" :key="testimonial.name" class="flex flex-col">
          <p class="flex-1 text-base leading-7 text-muted">“{{ testimonial.quote }}”</p>
          <div class="mt-6 flex items-center gap-3">
            <span
              class="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface-muted text-sm font-bold text-muted"
              aria-hidden="true"
            >
              {{ initials(testimonial.name) }}
            </span>
            <div>
              <strong class="block text-sm">{{ testimonial.name }}</strong>
              <span class="text-sm text-faint">{{ testimonial.role }}</span>
            </div>
          </div>
        </BaseCard>
      </div>
    </div>
  </section>
</template>
