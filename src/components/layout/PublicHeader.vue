<script setup>
import { ref } from 'vue'
import { RouterLink } from 'vue-router'

import { useAuthStore } from '../../stores/authStore'
import ThemeToggle from '../common/ThemeToggle.vue'
import UserMenu from './UserMenu.vue'

const auth = useAuthStore()

const isMenuOpen = ref(false)

const closeMenu = () => {
  isMenuOpen.value = false
}
</script>

<template>
  <header class="border-b border-border-subtle bg-surface-raised">
    <div class="page-container flex min-h-18 items-center justify-between gap-6">
      <RouterLink class="focus-ring rounded-sm text-sm font-black tracking-[0.14em] uppercase" to="/">
        Functional Fitness
      </RouterLink>

      <!-- Controles siempre visibles en móvil (sin abrir el menú). -->
      <div class="flex items-center gap-2 md:hidden">
        <ThemeToggle />
        <button
          class="focus-ring rounded-md border border-border-strong px-3 py-2 text-sm font-semibold"
          type="button"
          :aria-expanded="isMenuOpen"
          aria-controls="public-navigation"
          @click="isMenuOpen = !isMenuOpen"
        >
          Menú
        </button>
      </div>

      <nav
        id="public-navigation"
        class="absolute inset-x-0 top-18 z-10 border-b border-border-subtle bg-surface-raised p-4 shadow-sm md:static md:block md:border-0 md:p-0 md:shadow-none"
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

          <template v-if="auth.isAuthenticated">
            <RouterLink
              class="focus-ring rounded-sm py-2 text-sm font-medium"
              :to="auth.homeRoute"
              @click="closeMenu"
            >
              Mi panel
            </RouterLink>
            <UserMenu
              align="down"
              trigger-class="rounded-md border border-border-strong px-4 py-2.5 text-sm font-semibold text-body transition hover:bg-surface-muted"
              @click="closeMenu"
            />
          </template>

          <template v-else>
            <RouterLink
              class="focus-ring rounded-sm py-2 text-sm font-medium"
              to="/login"
              @click="closeMenu"
            >
              Iniciar sesión
            </RouterLink>
            <RouterLink
              class="focus-ring rounded-md bg-accent px-4 py-2.5 text-center text-sm font-semibold text-accent-foreground transition hover:bg-accent-hover"
              to="/register"
              @click="closeMenu"
            >
              Comenzar
            </RouterLink>
          </template>

          <ThemeToggle class="mt-1 hidden md:mt-0 md:inline-flex" />
        </div>
      </nav>
    </div>
  </header>
</template>
