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
      primary: 'bg-black text-white hover:bg-neutral-800',
      secondary: 'border border-black bg-white text-black hover:bg-neutral-100',
      ghost: 'bg-transparent text-black hover:bg-neutral-100',
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
