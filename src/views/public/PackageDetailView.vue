<script setup>
import { computed, onMounted } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import BaseButton from '../../components/common/BaseButton.vue'
import BaseCard from '../../components/common/BaseCard.vue'
import EmptyState from '../../components/common/EmptyState.vue'
import LoadingSpinner from '../../components/common/LoadingSpinner.vue'
import { usePackage } from '../../composables/usePackage'
import { useCurrency } from '../../composables/useCurrency'
import { useCheckout } from '../../composables/useCheckout'
import { useAuthStore } from '../../stores/authStore'

const props = defineProps({
  id: {
    type: String,
    required: true,
  },
})

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const { pkg, loading, error, load } = usePackage(props.id)
const { formatCurrency } = useCurrency()
const { purchasing, purchaseError, startCheckout } = useCheckout()

onMounted(load)

const formattedPrice = computed(() =>
  pkg.value ? formatCurrency(pkg.value.price, pkg.value.currency) : '',
)

const durationLabel = computed(() => {
  if (!pkg.value) return ''
  const days = pkg.value.duration_days
  return `${days} ${days === 1 ? 'día' : 'días'}`
})

const includes = computed(() => pkg.value?.includes ?? [])

function handlePurchase() {
  if (!auth.isAuthenticated) {
    // Preserva la ruta actual para volver aquí tras iniciar sesión.
    router.push({ name: 'login', query: { redirect: route.fullPath } })
    return
  }

  // Sesión activa: crea la preferencia de pago y redirige al checkout de
  // Mercado Pago. El estado de carga y los errores los gestiona el composable.
  startCheckout(props.id)
}
</script>

<template>
  <section class="py-16 sm:py-24">
    <div class="page-container max-w-3xl">
      <RouterLink
        class="focus-ring inline-block rounded-sm text-sm font-semibold underline underline-offset-4"
        to="/packages"
      >
        Volver a paquetes
      </RouterLink>

      <div class="mt-8">
        <LoadingSpinner v-if="loading" label="Cargando paquete" />

        <EmptyState
          v-else-if="error || !pkg"
          title="Paquete no disponible"
          :description="error || 'Este paquete no existe o ya no está disponible.'"
        />

        <BaseCard v-else>
          <div class="flex items-start justify-between gap-3">
            <h1 class="text-3xl font-black tracking-tight sm:text-4xl">{{ pkg.name }}</h1>
            <span
              v-if="pkg.is_recommended"
              class="shrink-0 rounded-full bg-brand-green px-3 py-1 text-xs font-bold text-white"
            >
              Recomendado
            </span>
          </div>

          <p class="mt-4 leading-7 text-neutral-600">{{ pkg.description }}</p>

          <div class="mt-6 flex items-baseline gap-2">
            <span class="text-4xl font-black tracking-tight">{{ formattedPrice }}</span>
            <span class="text-sm text-neutral-500">/ {{ durationLabel }}</span>
          </div>

          <div v-if="includes.length" class="mt-8">
            <h2 class="text-sm font-bold tracking-wide text-neutral-500 uppercase">Incluye</h2>
            <ul class="mt-3 space-y-2 text-sm text-neutral-700">
              <li v-for="item in includes" :key="item" class="flex items-start gap-2">
                <span class="mt-1.5 size-1.5 shrink-0 rounded-full bg-neutral-400" aria-hidden="true" />
                <span>{{ item }}</span>
              </li>
            </ul>
          </div>

          <div class="mt-10">
            <BaseButton type="button" :disabled="purchasing" @click="handlePurchase">
              {{ purchasing ? 'Redirigiendo…' : 'Quiero este plan' }}
            </BaseButton>

            <p v-if="purchaseError" class="mt-4 text-sm font-medium text-red-600" role="alert">
              {{ purchaseError }}
            </p>
          </div>
        </BaseCard>
      </div>
    </div>
  </section>
</template>
