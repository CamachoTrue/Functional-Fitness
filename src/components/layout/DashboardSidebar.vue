<script setup>
import { RouterLink, useRouter } from 'vue-router'

import { useAuthStore } from '../../stores/authStore'

defineProps({
  eyebrow: {
    type: String,
    required: true,
  },
  navigation: {
    type: Array,
    required: true,
  },
})

const auth = useAuthStore()
const router = useRouter()

const handleLogout = async () => {
  try {
    await auth.logout()
  } finally {
    router.push('/')
  }
}
</script>

<template>
  <aside class="flex flex-col bg-black p-5 text-white lg:min-h-screen lg:p-7">
    <RouterLink class="focus-ring block rounded-sm text-sm font-black tracking-[0.14em] uppercase" to="/">
      Functional Fitness
    </RouterLink>
    <p class="mt-2 text-xs font-semibold tracking-wider text-brand-green uppercase">{{ eyebrow }}</p>

    <nav class="mt-7 flex gap-2 overflow-x-auto lg:flex-col" :aria-label="eyebrow">
      <RouterLink
        v-for="item in navigation"
        :key="item.to"
        class="focus-ring shrink-0 rounded-md px-3 py-2.5 text-sm text-neutral-300 transition hover:bg-neutral-900 hover:text-white"
        active-class="bg-neutral-900 text-white"
        :to="item.to"
      >
        {{ item.label }}
      </RouterLink>
    </nav>

    <div class="mt-6 border-t border-neutral-800 pt-5 lg:mt-auto">
      <p class="truncate text-sm font-medium text-white">{{ auth.displayName }}</p>
      <button
        class="focus-ring mt-3 w-full rounded-md border border-neutral-700 px-3 py-2.5 text-left text-sm text-neutral-300 transition hover:bg-neutral-900 hover:text-white"
        type="button"
        @click="handleLogout"
      >
        Cerrar sesión
      </button>
    </div>
  </aside>
</template>
