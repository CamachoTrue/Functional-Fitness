<script setup>
import { ref } from 'vue'
import { RouterLink } from 'vue-router'

const isMenuOpen = ref(false)

const closeMenu = () => {
  isMenuOpen.value = false
}
</script>

<template>
  <header class="border-b border-neutral-200 bg-white">
    <div class="page-container flex min-h-18 items-center justify-between gap-6">
      <RouterLink class="focus-ring rounded-sm text-sm font-black tracking-[0.14em] uppercase" to="/">
        Functional Fitness
      </RouterLink>

      <button
        class="focus-ring rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold md:hidden"
        type="button"
        :aria-expanded="isMenuOpen"
        aria-controls="public-navigation"
        @click="isMenuOpen = !isMenuOpen"
      >
        Menú
      </button>

      <nav
        id="public-navigation"
        class="absolute inset-x-0 top-18 z-10 border-b border-neutral-200 bg-white p-4 shadow-sm md:static md:block md:border-0 md:p-0 md:shadow-none"
        :class="isMenuOpen ? 'block' : 'hidden md:block'"
        aria-label="Navegación principal"
      >
        <div class="page-container flex flex-col gap-2 md:w-auto md:flex-row md:items-center md:gap-7">
          <RouterLink class="focus-ring rounded-sm py-2 text-sm font-medium" to="/" @click="closeMenu">
            Inicio
          </RouterLink>
          <RouterLink
            class="focus-ring rounded-sm py-2 text-sm font-medium"
            to="/packages"
            @click="closeMenu"
          >
            Paquetes
          </RouterLink>
          <RouterLink
            class="focus-ring rounded-sm py-2 text-sm font-medium"
            to="/login"
            @click="closeMenu"
          >
            Iniciar sesión
          </RouterLink>
          <RouterLink
            class="focus-ring rounded-md bg-black px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-neutral-800"
            to="/register"
            @click="closeMenu"
          >
            Comenzar
          </RouterLink>
        </div>
      </nav>
    </div>
  </header>
</template>
