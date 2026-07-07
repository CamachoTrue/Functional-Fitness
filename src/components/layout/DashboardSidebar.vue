<script setup>
import { RouterLink } from 'vue-router'

import ThemeToggle from '../common/ThemeToggle.vue'
import UserMenu from './UserMenu.vue'

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
</script>

<template>
  <aside class="flex flex-col bg-surface-inverse p-5 text-on-inverse lg:min-h-screen lg:p-7">
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
      <div class="mb-3 flex justify-end">
        <ThemeToggle class="shrink-0" />
      </div>
      <UserMenu
        align="up"
        on-inverse
        trigger-class="w-full justify-between rounded-md border border-neutral-700 px-3 py-2.5 text-sm text-neutral-300 transition hover:bg-neutral-900 hover:text-white"
      />
    </div>
  </aside>
</template>
