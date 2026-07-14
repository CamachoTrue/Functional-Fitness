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
    <span class="size-5 animate-spin rounded-full border-2 border-border-strong border-t-brand-blue" />
    <span class="text-sm text-muted">{{ label }}</span>
  </div>
</template>
