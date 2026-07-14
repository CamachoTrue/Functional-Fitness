<script setup>
import { onMounted } from 'vue'
import { RouterLink } from 'vue-router'

import BaseBadge from '../../components/common/BaseBadge.vue'
import BaseButton from '../../components/common/BaseButton.vue'
import BaseCard from '../../components/common/BaseCard.vue'
import EmptyState from '../../components/common/EmptyState.vue'
import LoadingSpinner from '../../components/common/LoadingSpinner.vue'
import UserAvatar from '../../components/common/UserAvatar.vue'
import { useClientDashboard } from '../../composables/useClientDashboard'
import { useCurrency } from '../../composables/useCurrency'
import { useAuthStore } from '../../stores/authStore'

const auth = useAuthStore()
const { formatCurrency } = useCurrency()
const {
  loading,
  error,
  activePurchase,
  hasActivePlan,
  questionnaireStatus,
  routineStatus,
  daysRemaining,
  trainingDaysCount,
  todaySession,
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
    <!-- Saludo con avatar -->
    <div class="flex items-center gap-4">
      <UserAvatar :src="auth.avatarUrl" :name="auth.displayName" size="lg" />
      <div class="min-w-0">
        <p class="text-sm font-bold text-brand-blue">TU ENTRENAMIENTO</p>
        <h1 class="mt-1 truncate text-3xl font-black tracking-tight">
          Hola, {{ auth.displayName }}
        </h1>
      </div>
    </div>

    <div class="mt-8">
      <LoadingSpinner v-if="loading" label="Cargando tu panel" />

      <div v-else-if="error" class="rounded-xl border border-border-subtle bg-surface-raised p-6 shadow-sm">
        <p class="text-sm text-danger" role="alert">{{ error }}</p>
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
          class="focus-ring inline-flex min-h-11 items-center justify-center rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition hover:bg-accent-hover"
          to="/packages"
        >
          Ver paquetes
        </RouterLink>
      </EmptyState>

      <div v-else class="space-y-6">
        <!-- Tiles de métricas (honestas: derivadas del plan y la rutina) -->
        <div class="grid gap-4 sm:grid-cols-3">
          <BaseCard>
            <p class="text-xs font-semibold uppercase tracking-wide text-faint">Días restantes</p>
            <p class="mt-2 text-3xl font-black tracking-tight">
              {{ daysRemaining ?? '∞' }}
            </p>
            <p class="mt-1 text-xs text-muted">
              {{ daysRemaining === null ? 'Sin vencimiento' : 'de tu plan' }}
            </p>
          </BaseCard>

          <BaseCard>
            <p class="text-xs font-semibold uppercase tracking-wide text-faint">
              Días de entrenamiento
            </p>
            <p class="mt-2 text-3xl font-black tracking-tight">{{ trainingDaysCount }}</p>
            <p class="mt-1 text-xs text-muted">
              {{ routineStatus === 'ready' ? 'en tu rutina' : 'rutina en preparación' }}
            </p>
          </BaseCard>

          <BaseCard>
            <p class="text-xs font-semibold uppercase tracking-wide text-faint">Cuestionario</p>
            <div class="mt-2">
              <BaseBadge :variant="questionnaireStatus === 'completed' ? 'success' : 'warning'">
                {{ questionnaireStatus === 'completed' ? 'Completado' : 'Pendiente' }}
              </BaseBadge>
            </div>
            <p class="mt-2 text-xs text-muted">evaluación inicial</p>
          </BaseCard>
        </div>

        <!-- Tu sesión de hoy -->
        <BaseCard v-if="todaySession">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-brand-blue">
                Tu sesión de hoy
              </p>
              <h2 class="mt-1 text-xl font-black tracking-tight">
                Día {{ todaySession.dayNumber }} — {{ todaySession.title }}
              </h2>
              <p class="mt-1 text-sm text-muted">
                {{ todaySession.exerciseCount }}
                {{ todaySession.exerciseCount === 1 ? 'ejercicio' : 'ejercicios' }}
              </p>
            </div>
          </div>
          <RouterLink
            class="focus-ring mt-4 inline-flex min-h-11 items-center justify-center rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition hover:bg-accent-hover"
            to="/client/routine"
          >
            Comenzar sesión
          </RouterLink>
        </BaseCard>

        <!-- Plan vigente -->
        <BaseCard>
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-faint">
                Tu plan
              </p>
              <h2 class="mt-1 text-xl font-black tracking-tight">
                {{ activePurchase.package_name }}
              </h2>
              <p class="mt-1 text-sm text-muted">
                {{ formatCurrency(activePurchase.amount, activePurchase.currency) }}
              </p>
            </div>
            <BaseBadge variant="success">Activo</BaseBadge>
          </div>

          <dl class="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt class="text-xs font-semibold uppercase tracking-wide text-faint">
                Inicio
              </dt>
              <dd class="mt-0.5 font-medium text-body">
                {{ formatDate(activePurchase.start_date) ?? '—' }}
              </dd>
            </div>
            <div>
              <dt class="text-xs font-semibold uppercase tracking-wide text-faint">
                Vencimiento
              </dt>
              <dd class="mt-0.5 font-medium text-body">
                {{ formatDate(activePurchase.end_date) ?? 'Sin vencimiento' }}
              </dd>
            </div>
          </dl>
        </BaseCard>

        <!-- Cuestionario -->
        <BaseCard>
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-faint">
                Cuestionario
              </p>
              <h2 class="mt-1 text-lg font-bold">Evaluación inicial</h2>
              <p class="mt-1 text-sm text-muted">
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
            class="focus-ring mt-4 inline-flex min-h-11 items-center justify-center rounded-md border border-accent bg-surface-raised px-5 py-2.5 text-sm font-semibold text-body transition hover:bg-surface-muted"
            :to="`/client/questionnaire/${activePurchase.id}`"
          >
            {{ questionnaireStatus === 'completed' ? 'Editar cuestionario' : 'Completar cuestionario' }}
          </RouterLink>
        </BaseCard>

        <!-- Rutina -->
        <BaseCard>
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-faint">
                Rutina
              </p>
              <h2 class="mt-1 text-lg font-bold">Tu plan de entrenamiento</h2>
              <p class="mt-1 text-sm text-muted">
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
            class="focus-ring mt-4 inline-flex min-h-11 items-center justify-center rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition hover:bg-accent-hover"
            to="/client/routine"
          >
            Ver mi rutina
          </RouterLink>
        </BaseCard>
      </div>
    </div>
  </div>
</template>
