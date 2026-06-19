<script setup>
defineProps({
  label: {
    type: String,
    default: 'Cargando',
  },
})
</script>

<template>
  <div class="flex items-center gap-3" role="status">
    <span class="size-5 animate-spin rounded-full border-2 border-neutral-300 border-t-brand-green" />
    <span class="text-sm text-neutral-600">{{ label }}</span>
  </div>
</template>
