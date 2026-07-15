<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

import BaseCard from '../common/BaseCard.vue'
import { useCurrency } from '../../composables/useCurrency'
import { coverFor } from '../../utils/packageCovers'

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

const cover = computed(() => coverFor(props.pkg.name))

const formattedPrice = computed(() =>
  formatCurrency(props.pkg.price, props.pkg.currency),
)

const durationLabel = computed(() => {
  const days = props.pkg.duration_days
  return `${days} ${days === 1 ? 'día' : 'días'}`
})
</script>

<template>
  <BaseCard>
    <div class="flex h-full flex-col text-center">
      <!-- Portada del programa (si existe), a sangre en la parte superior. -->
      <div
        v-if="cover"
        class="relative -mx-6 -mt-6 mb-5 flex aspect-[3/4] items-center justify-center overflow-hidden rounded-t-xl bg-neutral-900"
      >
        <img :src="cover" :alt="`Portada del ${pkg.name}`" loading="lazy" class="h-full w-full object-contain" />
      </div>

      <div class="flex flex-1 flex-col items-center">
        <div v-if="pkg.is_recommended || isCurrent" class="mb-3 flex flex-wrap justify-center gap-2">
          <span
            v-if="pkg.is_recommended"
            class="rounded-full bg-brand-blue px-3 py-1 text-xs font-bold text-white"
          >
            Recomendado
          </span>
          <span
            v-if="isCurrent"
            class="rounded-full border border-brand-blue px-3 py-1 text-xs font-bold text-brand-blue"
          >
            Tu plan actual
          </span>
        </div>

        <h2 class="font-display text-sm font-medium tracking-[0.16em] uppercase">{{ pkg.name }}</h2>
        <p class="mt-1 text-xs tracking-[0.12em] text-faint uppercase">{{ durationLabel }}</p>
        <p class="mt-3 text-base text-muted">{{ formattedPrice }}</p>

        <RouterLink
          class="focus-ring mt-5 inline-flex rounded-sm text-xs font-medium tracking-[0.14em] uppercase underline underline-offset-4"
          :to="{ name: 'package-detail', params: { id: pkg.id } }"
        >
          Ver detalle
        </RouterLink>
      </div>
    </div>
  </BaseCard>
</template>
