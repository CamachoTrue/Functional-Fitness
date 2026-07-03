<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import BaseButton from '../../components/common/BaseButton.vue'
import BaseCard from '../../components/common/BaseCard.vue'
import EmptyState from '../../components/common/EmptyState.vue'
import LoadingSpinner from '../../components/common/LoadingSpinner.vue'
import { useCurrency } from '../../composables/useCurrency'
import { fetchMyPurchases } from '../../services/paymentService'

const { formatCurrency } = useCurrency()

const loading = ref(true)
const error = ref(false)
const purchases = ref([])

// Solo las compras confirmadas admiten cuestionario (barrera RLS). El resto no
// se muestra en esta vista de entrada al cuestionario.
const approvedPurchases = computed(() =>
  purchases.value.filter((purchase) => purchase.payment_status === 'approved'),
)

function hasQuestionnaire(purchase) {
  return Array.isArray(purchase.questionnaires) && purchase.questionnaires.length > 0
}

async function load() {
  loading.value = true
  error.value = false
  purchases.value = []
  try {
    purchases.value = await fetchMyPurchases()
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="mx-auto max-w-4xl">
    <p class="text-sm font-bold text-brand-green">TU EVALUACIÓN</p>
    <h1 class="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Mi evaluación</h1>
    <p class="mt-2 text-sm text-muted">
      Completa el cuestionario de cada compra confirmada para que preparemos tu rutina.
    </p>

    <div class="mt-8">
      <LoadingSpinner v-if="loading" label="Cargando tus compras" />

      <div v-else-if="error" class="rounded-xl border border-border-subtle bg-surface-raised p-6 shadow-sm">
        <p class="text-sm text-danger" role="alert">
          No pudimos cargar tus compras. Intenta de nuevo en unos minutos.
        </p>
        <BaseButton class="mt-4" type="button" variant="secondary" @click="load">
          Recargar
        </BaseButton>
      </div>

      <EmptyState
        v-else-if="approvedPurchases.length === 0"
        title="Aún no tienes compras confirmadas"
        description="Cuando confirmemos un pago, aquí podrás completar tu cuestionario de evaluación."
      >
        <RouterLink
          class="focus-ring inline-flex min-h-11 items-center justify-center rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition hover:bg-accent-hover"
          to="/packages"
        >
          Ver paquetes
        </RouterLink>
      </EmptyState>

      <ul v-else class="space-y-4">
        <li v-for="purchase in approvedPurchases" :key="purchase.id">
          <BaseCard>
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 class="text-lg font-bold">{{ purchase.package_name }}</h2>
                <p class="mt-1 text-sm text-muted">
                  {{ formatCurrency(purchase.amount, purchase.currency) }}
                </p>
                <span
                  class="mt-3 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
                  :class="
                    hasQuestionnaire(purchase)
                      ? 'bg-brand-green/10 text-brand-green'
                      : 'bg-surface-muted text-muted'
                  "
                >
                  Cuestionario: {{ hasQuestionnaire(purchase) ? 'COMPLETADO' : 'PENDIENTE' }}
                </span>
              </div>
              <RouterLink
                class="focus-ring inline-flex min-h-11 items-center justify-center rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition hover:bg-accent-hover"
                :to="`/client/questionnaire/${purchase.id}`"
              >
                {{ hasQuestionnaire(purchase) ? 'Editar cuestionario' : 'Completar cuestionario' }}
              </RouterLink>
            </div>
          </BaseCard>
        </li>
      </ul>
    </div>
  </div>
</template>
