<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import { useAuthStore } from '../../stores/authStore'
import ThemeToggle from '../common/ThemeToggle.vue'
import UserMenu from './UserMenu.vue'

const auth = useAuthStore()
const route = useRoute()

const isMenuOpen = ref(false)
const scrolled = ref(false)
const closeMenu = () => {
  isMenuOpen.value = false
}

// Las páginas con un hero a pantalla completa detrás del header (Home y catálogo
// de Paquetes) hacen que el header FLOTE transparente sobre la imagen y se vuelva
// sólido al hacer scroll (estilo referencia). En el resto es sólido desde el inicio.
const overlayHero = computed(() => route.path === '/' || route.path === '/packages')

// El header se muestra SÓLIDO (fondo + borde + colores normales) cuando: no hay
// hero detrás, o ya se hizo scroll, o el menú móvil está abierto. TRANSPARENTE
// (texto blanco sobre la imagen) solo en el tope de esas páginas.
const solid = computed(() => !overlayHero.value || scrolled.value || isMenuOpen.value)

function onScroll() {
  scrolled.value = window.scrollY > 24
}
onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }))
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))

const navLinkClass = computed(() =>
  [
    'focus-ring rounded-sm text-xs font-medium tracking-[0.12em] uppercase transition',
    solid.value ? 'text-muted hover:text-body' : 'text-white/80 hover:text-white',
  ].join(' '),
)

const ghostBtnClass = computed(() =>
  [
    'focus-ring hidden rounded-sm border px-4 py-2 text-xs font-medium tracking-[0.12em] uppercase transition sm:inline-flex',
    solid.value
      ? 'border-border-strong text-body hover:bg-surface-muted'
      : 'border-white/60 text-white hover:bg-white hover:text-black',
  ].join(' '),
)
</script>

<template>
  <header
    class="top-0 left-0 z-30 w-full transition-colors duration-300"
    :class="[
      overlayHero ? 'fixed' : 'relative',
      solid ? 'border-b border-border-subtle bg-surface-raised' : 'border-b border-transparent bg-transparent',
    ]"
  >
    <div class="page-container relative flex h-16 items-center justify-between gap-3">
      <!-- Izquierda: navegación (desktop) / botón menú (móvil) -->
      <div class="flex items-center gap-3 md:gap-6">
        <button
          class="focus-ring -ml-1 rounded-md p-2 md:hidden"
          :class="solid ? 'text-body' : 'text-white'"
          type="button"
          :aria-expanded="isMenuOpen"
          aria-controls="public-navigation"
          aria-label="Abrir menú"
          @click="isMenuOpen = !isMenuOpen"
        >
          <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path stroke-linecap="round" d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>

        <!-- Marca: a la izquierda en móvil; centrada de forma absoluta en desktop. -->
        <RouterLink
          class="focus-ring rounded-sm font-display text-base font-semibold tracking-[0.14em] whitespace-nowrap uppercase transition-colors md:absolute md:left-1/2 md:-translate-x-1/2 md:text-xl md:tracking-[0.28em]"
          :class="solid ? 'text-body' : 'text-white'"
          to="/"
        >
          Sera Trainer
        </RouterLink>

        <nav class="hidden items-center gap-7 md:flex" aria-label="Navegación principal">
          <RouterLink :class="navLinkClass" to="/">Inicio</RouterLink>
          <RouterLink :class="navLinkClass" to="/packages">Paquetes</RouterLink>
        </nav>
      </div>

      <!-- Derecha: acciones -->
      <div class="flex items-center gap-2 sm:gap-3">
        <ThemeToggle />
        <template v-if="auth.isAuthenticated">
          <RouterLink :class="[navLinkClass, 'hidden lg:inline']" :to="auth.homeRoute">Mi panel</RouterLink>
          <UserMenu
            align="down"
            compact
            :trigger-class="
              solid
                ? 'rounded-md border border-border-strong px-3 py-2 text-xs font-medium tracking-wide text-body transition hover:bg-surface-muted'
                : 'rounded-md border border-white/60 px-3 py-2 text-xs font-medium tracking-wide text-white transition hover:bg-white/10'
            "
          />
        </template>
        <template v-else>
          <RouterLink :class="[navLinkClass, 'hidden sm:inline']" to="/login">Entrar</RouterLink>
          <RouterLink :class="ghostBtnClass" to="/register">Comenzar</RouterLink>
        </template>
      </div>
    </div>

    <!-- Menú móvil desplegable -->
    <nav
      v-if="isMenuOpen"
      id="public-navigation"
      class="border-t border-border-subtle bg-surface-raised px-4 py-3 md:hidden"
      aria-label="Navegación principal móvil"
    >
      <div class="page-container flex flex-col gap-1">
        <RouterLink class="focus-ring rounded-md px-2 py-2.5 text-sm font-medium" to="/" @click="closeMenu">Inicio</RouterLink>
        <RouterLink class="focus-ring rounded-md px-2 py-2.5 text-sm font-medium" to="/packages" @click="closeMenu">Paquetes</RouterLink>
        <template v-if="auth.isAuthenticated">
          <RouterLink class="focus-ring rounded-md px-2 py-2.5 text-sm font-medium" :to="auth.homeRoute" @click="closeMenu">Mi panel</RouterLink>
        </template>
        <template v-else>
          <RouterLink class="focus-ring rounded-md px-2 py-2.5 text-sm font-medium" to="/login" @click="closeMenu">Entrar</RouterLink>
          <RouterLink class="focus-ring rounded-md px-2 py-2.5 text-sm font-medium" to="/register" @click="closeMenu">Comenzar</RouterLink>
        </template>
      </div>
    </nav>
  </header>
</template>
