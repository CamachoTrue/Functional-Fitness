<script setup>
import { ref } from 'vue'
import { RouterLink } from 'vue-router'

/**
 * Slider a pantalla completa para la parte superior del catálogo (estilo
 * referencia): imagen de fondo en B&N con título, subtítulo entre corchetes y una
 * breve descripción. Se navega con las flechas ‹ ›; un indicador de barras marca
 * la diapositiva actual. La primera diapositiva suele ser la intro ("Todos los
 * planes") y las siguientes, un plan cada una (con enlace a su detalle).
 */
const props = defineProps({
  slides: {
    type: Array,
    required: true,
  },
})

const index = ref(0)

function go(step) {
  const n = props.slides.length
  if (!n) return
  index.value = (index.value + step + n) % n
}
</script>

<template>
  <section
    class="relative h-screen min-h-[560px] overflow-hidden bg-black text-white"
    aria-roledescription="carrusel"
    aria-label="Planes"
  >
    <div
      v-for="(slide, i) in slides"
      :key="i"
      class="absolute inset-0 transition-opacity duration-700"
      :class="i === index ? 'opacity-100' : 'pointer-events-none opacity-0'"
      :aria-hidden="i !== index"
    >
      <img :src="slide.image" alt="" class="absolute inset-0 h-full w-full object-cover object-center" />
      <div class="absolute inset-0 bg-black/60" aria-hidden="true" />

      <div class="relative flex h-full flex-col items-center justify-center px-6 text-center">
        <!-- Título visual del slider (no es encabezado del documento: el encabezado
             semántico de cada plan vive en su tarjeta del catálogo). -->
        <p class="font-display text-4xl font-bold tracking-tight uppercase sm:text-6xl lg:text-7xl">
          {{ slide.title }}
        </p>
        <p
          v-if="slide.subtitle"
          class="mt-4 text-xs font-medium tracking-[0.16em] text-neutral-200 uppercase sm:mt-6 sm:text-base"
        >
          [ {{ slide.subtitle }} ]
        </p>
        <span class="my-6 block h-px w-8 bg-white/50 sm:my-8" aria-hidden="true" />
        <p class="max-w-xl text-sm leading-7 text-neutral-300 sm:text-base">{{ slide.description }}</p>
        <RouterLink
          v-if="slide.to"
          :to="slide.to"
          class="focus-ring mt-8 inline-flex min-h-11 items-center justify-center border border-white/70 px-8 text-xs font-medium tracking-[0.16em] uppercase transition hover:bg-white hover:text-black"
        >
          Ver plan
        </RouterLink>
      </div>
    </div>

    <!-- Controles: flechas + indicador -->
    <div class="absolute inset-x-0 bottom-8 z-10 flex items-center justify-center gap-5 sm:bottom-10">
      <button
        type="button"
        class="focus-ring rounded-full p-2 text-white/80 transition hover:text-white"
        aria-label="Plan anterior"
        @click="go(-1)"
      >
        <svg class="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 6l-6 6 6 6" />
        </svg>
      </button>

      <div class="flex items-center gap-2">
        <button
          v-for="(slide, i) in slides"
          :key="i"
          type="button"
          class="focus-ring h-0.5 w-7 rounded-full transition-colors"
          :class="i === index ? 'bg-white' : 'bg-white/30 hover:bg-white/60'"
          :aria-label="`Ir a la diapositiva ${i + 1}`"
          :aria-current="i === index"
          @click="index = i"
        />
      </div>

      <button
        type="button"
        class="focus-ring rounded-full p-2 text-white/80 transition hover:text-white"
        aria-label="Plan siguiente"
        @click="go(1)"
      >
        <svg class="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 6l6 6-6 6" />
        </svg>
      </button>
    </div>
  </section>
</template>
