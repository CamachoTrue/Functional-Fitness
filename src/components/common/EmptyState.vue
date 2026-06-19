<script setup>
defineProps({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
})
</script>

<template>
  <div class="rounded-xl border border-dashed border-neutral-300 bg-white px-6 py-12 text-center">
    <h2 class="text-lg font-bold">{{ title }}</h2>
    <p v-if="description" class="mx-auto mt-2 max-w-lg text-sm leading-6 text-neutral-600">
      {{ description }}
    </p>
    <div v-if="$slots.default" class="mt-5">
      <slot />
    </div>
  </div>
</template>
