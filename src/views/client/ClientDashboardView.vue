<script setup>
import { onMounted } from 'vue'
import { RouterLink } from 'vue-router'

import BaseBadge from '../../components/common/BaseBadge.vue'
import BaseButton from '../../components/common/BaseButton.vue'
import BaseCard from '../../components/common/BaseCard.vue'
import EmptyState from '../../components/common/EmptyState.vue'
import LoadingSpinner from '../../components/common/LoadingSpinner.vue'
import { useClientDashboard } from '../../composables/useClientDashboard'
import { useCurrency } from '../../composables/useCurrency'

const { formatCurrency } = useCurrency()
const {
  loading,
  error,
  activePurchase,
  hasActivePlan,
  questionnaireStatus,
  routineStatus,
  load,
} = useClientDashboard()

function formatDate(value) {
  if (!value) return null
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' }).format(new Date(value))
}

onMounted(load)
</script>

<template>
  <div class="mx-auto max-w-4xl">
    <p class="text-sm font-bold text-brand-green">TU ENTRENAMIENTO</p>
    <h1 class="mt-2 text-3xl font-black tracking-tight">Resumen</h1>

    <div class="mt-8">
      <LoadingSpinner v-if="loading" label="Cargando tu panel" />

      <div v-else-if="error" class="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <p class="text-sm text-red-700" role="alert">{{ error }}</p>
        <BaseButton class="mt-4" type="button" variant="secondary" @click="load">
          Recargar
        </BaseButton>
      </div>

      <EmptyState
        v-else-if="!hasActivePlan"
        title="Aún no tienes un plan activo"
        description="Cuando confirmemos un pago, aquí verás el estado de tu cuestionario y tu rutina."
      >
        <RouterLink
          class="focus-ring inline-flex min-h-11 items-center justify-center rounded-md bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800"
          to="/packages"
        >
          Ver paquetes
        </RouterLink>
      </EmptyState>

      <div v-else class="space-y-6">
        <!-- Plan vigente -->
        <BaseCard>
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Tu plan
              </p>
              <h2 class="mt-1 text-xl font-black tracking-tight">
                {{ activePurchase.package_name }}
              </h2>
              <p class="mt-1 text-sm text-neutral-600">
                {{ formatCurrency(activePurchase.amount, activePurchase.currency) }}
              </p>
            </div>
            <BaseBadge variant="success">Activo</BaseBadge>
          </div>

          <dl class="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt class="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Inicio
              </dt>
              <dd class="mt-0.5 font-medium text-neutral-900">
                {{ formatDate(activePurchase.start_date) ?? '—' }}
              </dd>
            </div>
            <div>
              <dt class="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Vencimiento
              </dt>
              <dd class="mt-0.5 font-medium text-neutral-900">
                {{ formatDate(activePurchase.end_date) ?? 'Sin vencimiento' }}
              </dd>
            </div>
          </dl>
        </BaseCard>

        <!-- Cuestionario -->
        <BaseCard>
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Cuestionario
              </p>
              <h2 class="mt-1 text-lg font-bold">Evaluación inicial</h2>
              <p class="mt-1 text-sm text-neutral-600">
                {{
                  questionnaireStatus === 'completed'
                    ? 'Ya completaste tu cuestionario. Puedes actualizarlo cuando quieras.'
                    : 'Complétalo para que preparemos tu rutina a tu medida.'
                }}
              </p>
            </div>
            <BaseBadge :variant="questionnaireStatus === 'completed' ? 'success' : 'warning'">
              {{ questionnaireStatus === 'completed' ? 'Completado' : 'Pendiente' }}
            </BaseBadge>
          </div>

          <RouterLink
            class="focus-ring mt-4 inline-flex min-h-11 items-center justify-center rounded-md border border-black bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-neutral-100"
            :to="`/client/questionnaire/${activePurchase.id}`"
          >
            {{ questionnaireStatus === 'completed' ? 'Editar cuestionario' : 'Completar cuestionario' }}
          </RouterLink>
        </BaseCard>

        <!-- Rutina -->
        <BaseCard>
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Rutina
              </p>
              <h2 class="mt-1 text-lg font-bold">Tu plan de entrenamiento</h2>
              <p class="mt-1 text-sm text-neutral-600">
                {{
                  routineStatus === 'ready'
                    ? 'Tu rutina está lista. Consulta tus días de entrenamiento y los videos.'
                    : 'Estamos preparando tu rutina. Te avisaremos en cuanto esté lista.'
                }}
              </p>
            </div>
            <BaseBadge :variant="routineStatus === 'ready' ? 'success' : 'neutral'">
              {{ routineStatus === 'ready' ? 'Lista' : 'En preparación' }}
            </BaseBadge>
          </div>

          <RouterLink
            v-if="routineStatus === 'ready'"
            class="focus-ring mt-4 inline-flex min-h-11 items-center justify-center rounded-md bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800"
            to="/client/routine"
          >
            Ver mi rutina
          </RouterLink>
        </BaseCard>
      </div>
    </div>
  </div>
</template>
