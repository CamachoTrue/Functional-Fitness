<script setup>
import { onMounted, ref } from 'vue'

import EmptyState from '../../components/common/EmptyState.vue'
import LoadingSpinner from '../../components/common/LoadingSpinner.vue'
import PackageCard from '../../components/packages/PackageCard.vue'
import { usePackages } from '../../composables/usePackages'
import { useAuthStore } from '../../stores/authStore'
import { fetchMyPurchases } from '../../services/paymentService'

const { packages, loading, error, load } = usePackages()
const auth = useAuthStore()

// Id del paquete del plan activo del usuario, para marcar su plan actual en la
// comparación. Solo aplica a clientes autenticados con una compra vigente.
const currentPackageId = ref(null)

function isActiveApproved(purchase) {
  if (purchase?.payment_status !== 'approved') return false
  const now = Date.now()
  if (purchase.start_date && new Date(purchase.start_date).getTime() > now) return false
  if (purchase.end_date && new Date(purchase.end_date).getTime() <= now) return false
  return true
}

async function loadCurrentPlan() {
  if (!auth.isAuthenticated || auth.isAdmin) return
  try {
    const purchases = await fetchMyPurchases()
    currentPackageId.value = purchases.find((p) => isActiveApproved(p))?.package_id ?? null
  } catch {
    currentPackageId.value = null
  }
}

onMounted(() => {
  load()
  loadCurrentPlan()
})
</script>

<template>
  <!-- Hero fijo del catálogo (imagen a pantalla completa "Todos los planes"). -->
  <section class="relative flex h-screen min-h-[600px] items-center justify-center overflow-hidden bg-black text-white">
    <img src="/images/hero.jpg" alt="" class="absolute inset-0 h-full w-full object-cover object-center" />
    <div class="absolute inset-0 bg-black/60" aria-hidden="true" />
    <div class="relative flex flex-col items-center px-6 text-center">
      <p class="font-display text-4xl font-bold tracking-tight uppercase sm:text-6xl lg:text-7xl">
        Todos los planes
      </p>
      <p class="mt-4 text-xs font-medium tracking-[0.16em] text-neutral-200 uppercase sm:mt-6 sm:text-base">
        [ Todos nuestros programas · Sera Trainer ]
      </p>
      <span class="my-6 block h-px w-8 bg-white/50 sm:my-8" aria-hidden="true" />
      <p class="max-w-xl text-sm leading-7 text-neutral-300 sm:text-base">
        Aquí están todos nuestros planes de entrenamiento. Sin importar tu objetivo, están
        diseñados para llevarte a tu mejor versión.
      </p>
    </div>
  </section>

  <section class="py-16 sm:py-24">
    <div class="page-container">
      <div class="text-center">
        <h1 class="font-display text-3xl font-light tracking-[0.08em] uppercase sm:text-4xl">
          Elige tu plan
        </h1>
        <p class="mt-3 text-xs font-medium tracking-[0.16em] text-muted uppercase">
          Todos nuestros programas de entrenamiento
        </p>
      </div>

      <div class="mt-12">
        <LoadingSpinner v-if="loading" label="Cargando paquetes" />

        <EmptyState
          v-else-if="error"
          title="Ocurrió un problema"
          :description="error"
        />

        <div
          v-else-if="packages.length"
          class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          <PackageCard
            v-for="pkg in packages"
            :key="pkg.id"
            :pkg="pkg"
            :is-current="pkg.id === currentPackageId"
          />
        </div>

        <EmptyState
          v-else
          title="Sin paquetes"
          description="No hay paquetes disponibles por ahora."
        />
      </div>
    </div>
  </section>
</template>
