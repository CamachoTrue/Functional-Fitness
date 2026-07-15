<script setup>
import { computed, onMounted } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import BaseButton from '../../components/common/BaseButton.vue'
import EmptyState from '../../components/common/EmptyState.vue'
import LoadingSpinner from '../../components/common/LoadingSpinner.vue'
import { usePackage } from '../../composables/usePackage'
import { useCurrency } from '../../composables/useCurrency'
import { useCheckout } from '../../composables/useCheckout'
import { useAuthStore } from '../../stores/authStore'
import { coverFor } from '../../utils/packageCovers'

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

const cover = computed(() => (pkg.value ? coverFor(pkg.value.name) : null))

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

        <div v-else class="mx-auto max-w-2xl">
          <!-- Portada centrada (estilo "producto" de la referencia). -->
          <div v-if="cover" class="mx-auto max-w-[16rem] sm:max-w-xs">
            <div class="flex aspect-[3/4] items-center justify-center overflow-hidden rounded-lg bg-neutral-900 shadow-xl">
              <img :src="cover" :alt="`Portada del ${pkg.name}`" class="h-full w-full object-contain" />
            </div>
          </div>

          <!-- Nombre, subtítulo y precio, centrados. -->
          <div class="mt-10 text-center">
            <span
              v-if="pkg.is_recommended"
              class="inline-block rounded-full bg-brand-blue px-3 py-1 text-xs font-bold text-white"
            >
              Recomendado
            </span>
            <h1 class="mt-3 font-display text-3xl font-medium tracking-[0.1em] uppercase sm:text-4xl">
              {{ pkg.name }}
            </h1>
            <p class="mt-2 text-xs tracking-[0.18em] text-faint uppercase">{{ durationLabel }}</p>
            <p class="mt-5 text-2xl font-medium tracking-tight">{{ formattedPrice }}</p>
          </div>

          <!-- Compra. -->
          <div class="mt-8 flex flex-col items-center">
            <BaseButton type="button" :disabled="purchasing" @click="handlePurchase">
              {{ purchasing ? 'Redirigiendo…' : 'Quiero este plan' }}
            </BaseButton>
            <p v-if="purchaseError" class="mt-4 text-sm font-medium text-danger" role="alert">
              {{ purchaseError }}
            </p>
          </div>

          <!-- Detalles en acordeones (+/−), como en la referencia: la descripción
               y lo que incluye se expanden al hacer clic. -->
          <div class="mt-14 border-t border-border-subtle">
            <details class="group border-b border-border-subtle">
              <summary
                class="focus-ring flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-sm font-medium tracking-[0.06em] uppercase"
              >
                <span>Descripción del programa</span>
                <span class="text-xl leading-none text-faint" aria-hidden="true">
                  <span class="group-open:hidden">+</span>
                  <span class="hidden group-open:inline">−</span>
                </span>
              </summary>
              <p class="pb-6 text-sm leading-7 text-muted">{{ pkg.description }}</p>
            </details>

            <details v-if="includes.length" class="group border-b border-border-subtle">
              <summary
                class="focus-ring flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-sm font-medium tracking-[0.06em] uppercase"
              >
                <span>Qué incluye</span>
                <span class="text-xl leading-none text-faint" aria-hidden="true">
                  <span class="group-open:hidden">+</span>
                  <span class="hidden group-open:inline">−</span>
                </span>
              </summary>
              <ul class="space-y-2 pb-6 text-sm leading-7 text-muted">
                <li v-for="item in includes" :key="item" class="flex items-start gap-2">
                  <span class="mt-2 size-1.5 shrink-0 rounded-full bg-border-strong" aria-hidden="true" />
                  <span>{{ item }}</span>
                </li>
              </ul>
            </details>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
