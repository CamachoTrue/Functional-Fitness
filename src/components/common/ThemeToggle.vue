<script setup>
import { computed } from 'vue'

import { useTheme } from '../../composables/useTheme'

/**
 * Interruptor (switch) deslizante para alternar entre modo claro y oscuro.
 * La manija se desliza: sol a la izquierda en claro, luna a la derecha en oscuro.
 * Accesible: role="switch" + aria-checked + aria-label; se maneja con teclado
 * como un botón nativo. Iconos SVG inline, sin dependencias externas.
 */
const { isDark, toggleTheme } = useTheme()

const label = computed(() =>
  isDark.value ? 'Activar modo claro' : 'Activar modo oscuro',
)
</script>

<template>
  <button
    class="focus-ring relative inline-flex h-8 w-14 shrink-0 items-center rounded-full bg-neutral-200 transition-colors dark:bg-neutral-700"
    type="button"
    role="switch"
    :aria-checked="isDark"
    :aria-label="label"
    :title="label"
    @click="toggleTheme"
  >
    <span
      class="absolute left-1 inline-flex size-6 items-center justify-center rounded-full bg-white text-neutral-900 shadow-sm transition-transform duration-200 dark:translate-x-6 dark:bg-neutral-900 dark:text-white"
    >
      <!-- Luna: modo oscuro (la manija está a la derecha). -->
      <svg
        v-if="isDark"
        class="size-4"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
      </svg>
      <!-- Sol: modo claro (la manija está a la izquierda). -->
      <svg
        v-else
        class="size-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4.5" fill="currentColor" stroke="none" />
        <path
          d="M12 1.5v2.5m0 16v2.5M4 4l1.8 1.8m12.4 12.4L20 20M1.5 12h2.5m16 0h2.5M4 20l1.8-1.8m12.4-12.4L20 4"
        />
      </svg>
    </span>
  </button>
</template>
