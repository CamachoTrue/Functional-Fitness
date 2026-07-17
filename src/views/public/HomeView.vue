<script setup>
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import FaqSection from '../../components/public/FaqSection.vue'
import { fetchActivePackages } from '../../services/packagesService'
import { useCurrency } from '../../composables/useCurrency'
import { coverUrlFor } from '../../utils/packageCovers'

const { formatCurrency } = useCurrency()

// Programas destacados: los paquetes activos reales (hasta 3), al estilo de la
// grilla de productos de la referencia.
const featured = ref([])
onMounted(async () => {
  try {
    featured.value = (await fetchActivePackages()).slice(0, 3)
  } catch {
    featured.value = []
  }
})

// "Mantente al día": captura de correo puramente visual por ahora (el newsletter
// llega con la fase de tienda). No hay backend: solo feedback en pantalla.
const email = ref('')
const subscribed = ref(false)
function onSubscribe() {
  if (!email.value.trim()) return
  subscribed.value = true
  email.value = ''
}

// Reseñas (placeholder hasta tener reseñas reales verificadas).
const reviews = [
  {
    quote:
      'Nunca había seguido una rutina tan clara. Saber exactamente qué hacer cada día me quitó toda la incertidumbre.',
    name: 'Ana Ramírez',
    context: 'Entrena desde casa',
  },
]
</script>

<template>
  <!-- HERO a pantalla completa (imagen en B&N). El header flota encima. -->
  <section class="relative flex h-screen min-h-[600px] items-end justify-center overflow-hidden bg-black">
    <img
      src="/images/hero.jpg"
      alt="Entrenamiento funcional en Sera Trainer"
      class="absolute inset-0 h-full w-full object-cover object-center"
    />
    <!-- Oscurecido para legibilidad del texto y los CTA sobre la imagen. -->
    <div class="absolute inset-0 bg-black/40" aria-hidden="true" />
    <div class="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 to-transparent" aria-hidden="true" />

    <div class="relative z-10 mb-14 flex flex-col items-center px-4 text-center">
      <h1 class="font-display text-sm font-light tracking-[0.35em] text-white uppercase sm:text-base">
        Entrenamiento personalizado
      </h1>
      <!-- Botones siempre en una fila (también en móvil): comparten el ancho y
           reducen padding/tracking en pantallas chicas para caber en una línea. -->
      <div class="mt-8 flex w-full max-w-md gap-3 sm:w-auto sm:max-w-none sm:gap-4">
        <RouterLink
          class="focus-ring inline-flex min-h-12 flex-1 items-center justify-center border border-white/70 px-3 text-[11px] font-medium tracking-[0.1em] whitespace-nowrap text-white uppercase transition hover:bg-white hover:text-black sm:flex-none sm:px-10 sm:text-xs sm:tracking-[0.18em]"
          to="/planes"
        >
          Ver paquetes
        </RouterLink>
        <RouterLink
          class="focus-ring inline-flex min-h-12 flex-1 items-center justify-center border border-white/40 px-3 text-[11px] font-medium tracking-[0.1em] whitespace-nowrap text-white uppercase transition hover:bg-white hover:text-black sm:flex-none sm:px-10 sm:text-xs sm:tracking-[0.18em]"
          to="/registro"
        >
          Quiero comenzar
        </RouterLink>
      </div>
    </div>
  </section>

  <!-- MISIÓN -->
  <section id="mission" class="page-container py-24 sm:py-32">
    <p class="text-xs font-medium tracking-[0.2em] text-muted uppercase">Nuestra misión</p>
    <h2 class="mt-6 max-w-4xl font-display text-3xl leading-tight font-light tracking-tight uppercase sm:text-5xl">
      Entrenamiento serio, hecho a tu medida.
    </h2>
    <p class="mt-6 max-w-2xl text-base leading-7 text-muted">
      Diseñamos cada plan a partir de tu evaluación inicial y lo ajustamos a tu progreso. Nada de
      plantillas genéricas: estructura clara, videos de referencia y dirección real en cada sesión.
    </p>
  </section>

  <!-- PROGRAMAS DESTACADOS -->
  <section v-if="featured.length" class="page-container pb-24 sm:pb-28">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <h2 class="font-display text-2xl font-light tracking-[0.08em] uppercase sm:text-3xl">Programas</h2>
      <RouterLink
        class="focus-ring rounded-sm text-xs font-medium tracking-[0.14em] text-muted uppercase transition hover:text-body"
        to="/planes"
      >
        Ver todos →
      </RouterLink>
    </div>

    <div class="mt-12 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
      <RouterLink
        v-for="pkg in featured"
        :key="pkg.id"
        class="focus-ring group block"
        :to="{ name: 'package-detail', params: { id: pkg.id } }"
      >
        <!-- PORTADA: imagen del programa si existe; si no, placeholder oscuro con el nombre. -->
        <div class="relative flex aspect-[3/4] items-center justify-center overflow-hidden bg-neutral-900">
          <img
            v-if="coverUrlFor(pkg)"
            :src="coverUrlFor(pkg)"
            :alt="`Portada del ${pkg.name}`"
            loading="lazy"
            class="h-full w-full object-contain transition-transform duration-500 group-hover:scale-[1.03]"
          />
          <template v-else>
            <div class="absolute inset-0 bg-gradient-to-br from-neutral-800 to-black" aria-hidden="true" />
            <span class="relative max-w-[70%] text-center font-display text-lg font-light tracking-[0.1em] text-neutral-500 uppercase">
              {{ pkg.name }}
            </span>
          </template>
        </div>
        <h3 class="mt-5 text-center font-display text-sm font-medium tracking-[0.16em] uppercase transition group-hover:text-muted">
          {{ pkg.name }}
        </h3>
        <p class="mt-1 text-center text-xs tracking-[0.1em] text-faint uppercase">
          {{ pkg.duration_days }} días
        </p>
        <p class="mt-3 text-center text-sm text-muted">{{ formatCurrency(pkg.price, pkg.currency) }}</p>
      </RouterLink>
    </div>
  </section>

  <!-- GRID DE 3 IMÁGENES (accesos) -->
  <section class="grid gap-px bg-border-subtle sm:grid-cols-3">
    <RouterLink
      v-for="tile in [
        { label: 'Paquetes', to: '/planes', img: '/images/paquetes.jpg' },
        { label: 'Nuestra misión', to: '/#mission', img: '/images/mision.jpg' },
        { label: 'Comenzar', to: '/registro', img: '/images/comenzar.jpg' },
      ]"
      :key="tile.label"
      class="focus-ring group relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-black"
      :to="tile.to"
    >
      <img
        :src="tile.img"
        :alt="tile.label"
        loading="lazy"
        class="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <div class="absolute inset-0 bg-black/55 transition-colors duration-300 group-hover:bg-black/40" aria-hidden="true" />
      <span class="relative font-display text-lg font-medium tracking-[0.2em] text-white uppercase">
        {{ tile.label }}
      </span>
    </RouterLink>
  </section>

  <!-- RESEÑAS -->
  <section class="page-container py-24 text-center sm:py-28">
    <h2 class="font-display text-2xl font-light tracking-[0.12em] uppercase sm:text-3xl">Reseñas</h2>
    <div class="mt-4 flex items-center justify-center gap-2 text-sm text-muted">
      <span class="tracking-widest text-body" aria-hidden="true">★★★★★</span>
      <span>Clientes reales</span>
    </div>

    <figure
      v-for="review in reviews"
      :key="review.name"
      class="mx-auto mt-10 max-w-3xl border border-border-subtle p-10 sm:p-14"
    >
      <span class="font-display text-4xl leading-none text-faint" aria-hidden="true">”</span>
      <blockquote class="mt-4 text-lg leading-8 text-body">{{ review.quote }}</blockquote>
      <figcaption class="mt-8">
        <span class="tracking-widest text-body" aria-hidden="true">★★★★★</span>
        <p class="mt-3 font-display text-sm font-medium tracking-[0.14em] uppercase">{{ review.name }}</p>
        <p class="mt-1 text-xs tracking-[0.1em] text-faint uppercase">{{ review.context }}</p>
      </figcaption>
    </figure>
  </section>

  <FaqSection />

  <!-- MANTENTE AL DÍA -->
  <section class="page-container border-t border-border-subtle py-24 text-center sm:py-28">
    <h2 class="font-display text-3xl font-light tracking-[0.12em] uppercase sm:text-4xl">Mantente al día</h2>
    <p class="mx-auto mt-4 max-w-xl text-sm leading-7 text-muted">
      Recibe primero las novedades, nuevos programas y contenido de entrenamiento.
    </p>

    <form class="mx-auto mt-8 flex max-w-md items-center border border-border-strong" @submit.prevent="onSubscribe">
      <label class="sr-only" for="newsletter-email">Correo electrónico</label>
      <input
        id="newsletter-email"
        v-model="email"
        type="email"
        required
        placeholder="Correo electrónico"
        class="focus-ring min-w-0 flex-1 bg-transparent px-4 py-3.5 text-sm text-body placeholder:text-faint"
      />
      <button
        type="submit"
        class="focus-ring flex size-12 shrink-0 items-center justify-center border-l border-border-strong text-body transition hover:bg-surface-muted"
        aria-label="Suscribirse"
      >
        →
      </button>
    </form>
    <p v-if="subscribed" class="mt-4 text-sm text-brand-blue" role="status">
      ¡Listo! Te avisaremos de las novedades.
    </p>
  </section>
</template>
