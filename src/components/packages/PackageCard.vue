<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

import BaseCard from '../common/BaseCard.vue'
import { useCurrency } from '../../composables/useCurrency'

const props = defineProps({
  pkg: {
    type: Object,
    required: true,
  },
  // Marca esta tarjeta como el plan activo del usuario (comparación de planes).
  isCurrent: {
    type: Boolean,
    default: false,
  },
})

const { formatCurrency } = useCurrency()

const formattedPrice = computed(() =>
  formatCurrency(props.pkg.price, props.pkg.currency),
)

const durationLabel = computed(() => {
  const days = props.pkg.duration_days
  return `${days} ${days === 1 ? 'día' : 'días'}`
})

const includes = computed(() => props.pkg.includes ?? [])
</script>

<template>
  <BaseCard>
    <div class="flex h-full flex-col">
      <div class="flex items-start justify-between gap-3">
        <h2 class="text-lg font-bold tracking-tight">{{ pkg.name }}</h2>
        <span
          v-if="pkg.is_recommended"
          class="shrink-0 rounded-full bg-brand-blue px-3 py-1 text-xs font-bold text-white"
        >
          Recomendado
        </span>
      </div>

      <span
        v-if="isCurrent"
        class="mt-3 inline-flex w-fit items-center rounded-full border border-brand-blue px-3 py-1 text-xs font-bold text-brand-blue"
      >
        Tu plan actual
      </span>

      <p class="mt-2 text-sm leading-6 text-muted">{{ pkg.description }}</p>

      <div class="mt-5 flex items-baseline gap-2">
        <span class="text-3xl font-black tracking-tight">{{ formattedPrice }}</span>
        <span class="text-sm text-faint">/ {{ durationLabel }}</span>
      </div>

      <ul v-if="includes.length" class="mt-5 space-y-2 text-sm text-muted">
        <li v-for="item in includes" :key="item" class="flex items-start gap-2">
          <span class="mt-1.5 size-1.5 shrink-0 rounded-full bg-faint" aria-hidden="true" />
          <span>{{ item }}</span>
        </li>
      </ul>

      <RouterLink
        class="focus-ring mt-6 inline-flex rounded-sm text-sm font-semibold underline underline-offset-4"
        :to="{ name: 'package-detail', params: { id: pkg.id } }"
      >
        Ver detalle
      </RouterLink>
    </div>
  </BaseCard>
</template>
