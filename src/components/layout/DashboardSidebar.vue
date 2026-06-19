<script setup>
import { RouterLink } from 'vue-router'

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
  <aside class="bg-black p-5 text-white lg:min-h-screen lg:p-7">
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
  </aside>
</template>
