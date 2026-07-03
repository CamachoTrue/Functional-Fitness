<script setup>
import { computed } from 'vue'

const props = defineProps({
  variant: {
    type: String,
    default: 'primary',
    validator: (value) => ['primary', 'secondary', 'ghost'].includes(value),
  },
  type: {
    type: String,
    default: 'button',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})

const variantClasses = computed(
  () =>
    ({
      primary: 'bg-accent text-accent-foreground hover:bg-accent-hover',
      secondary: 'border border-accent bg-surface-raised text-body hover:bg-surface-muted',
      ghost: 'bg-transparent text-body hover:bg-surface-muted',
    })[props.variant],
)
</script>

<template>
  <button
    class="focus-ring inline-flex min-h-11 items-center justify-center rounded-md px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
    :class="variantClasses"
    :type="type"
    :disabled="disabled"
  >
    <slot />
  </button>
</template>
