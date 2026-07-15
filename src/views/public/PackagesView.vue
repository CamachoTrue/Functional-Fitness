<script setup>
import { computed, onMounted, ref } from 'vue'

import EmptyState from '../../components/common/EmptyState.vue'
import LoadingSpinner from '../../components/common/LoadingSpinner.vue'
import PackageCard from '../../components/packages/PackageCard.vue'
import PackagesHeroSlider from '../../components/packages/PackagesHeroSlider.vue'
import { usePackages } from '../../composables/usePackages'
import { useAuthStore } from '../../stores/authStore'
import { fetchMyPurchases } from '../../services/paymentService'
import { slideFor } from '../../utils/packageSlides'

const { packages, loading, error, load } = usePackages()
const auth = useAuthStore()

// Diapositivas del slider superior: primero la intro y luego un plan por
// diapositiva (nombre + subtítulo + descripción real + imagen + enlace al detalle).
const slides = computed(() => {
  const intro = {
    title: 'Todos los planes',
    subtitle: 'Todos nuestros programas · Sera Trainer',
    description:
      'Aquí están todos nuestros planes de entrenamiento. Sin importar tu objetivo, están diseñados para llevarte a tu mejor versión.',
    image: '/images/hero.jpg',
  }
  const planSlides = packages.value.map((pkg) => {
    const slide = slideFor(pkg.name) ?? {}
    return {
      title: pkg.name,
      subtitle: slide.subtitle ?? '',
      description: pkg.description ?? '',
      image: slide.image ?? '/images/hero.jpg',
      to: { name: 'package-detail', params: { id: pkg.id } },
    }
  })
  return [intro, ...planSlides]
})

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
  <!-- Slider superior a pantalla completa (intro + un plan por diapositiva). -->
  <PackagesHeroSlider v-if="!loading && packages.length" :slides="slides" />

  <section class="py-16 sm:py-24">
    <div class="page-container">
      <div class="text-center">
        <h1 class="font-display text-3xl font-light tracking-[0.08em] uppercase sm:text-4xl">
          Todos los planes
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
