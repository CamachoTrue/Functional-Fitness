<script setup>
import { computed } from 'vue'

/**
 * Badge de estado tipo "pill". El verde de acento (bg-brand-blue/10
 * text-brand-blue) se reserva EXCLUSIVAMENTE para la variante success,
 * coherente con el badge de cuestionario de ClientPurchasesView. El resto de
 * variantes usa tonos neutros/ámbar/rojo/azul suaves. Un variant inválido cae a
 * neutral, siguiendo el patrón de validación de BaseButton.
 */
const props = defineProps({
  variant: {
    type: String,
    default: 'neutral',
    validator: (value) =>
      ['neutral', 'success', 'warning', 'danger', 'info'].includes(value),
  },
})

const VARIANT_CLASSES = {
  neutral: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200',
  success: 'bg-brand-blue/10 text-brand-blue',
  warning: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  danger: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
}

const variantClasses = computed(
  () => VARIANT_CLASSES[props.variant] ?? VARIANT_CLASSES.neutral,
)
</script>

<template>
  <span
    class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
    :class="variantClasses"
  >
    <slot />
  </span>
</template>
