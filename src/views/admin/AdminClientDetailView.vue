<script setup>
import { computed, onMounted, watch } from 'vue'
import { RouterLink } from 'vue-router'

import BaseBadge from '../../components/common/BaseBadge.vue'
import BaseButton from '../../components/common/BaseButton.vue'
import BaseCard from '../../components/common/BaseCard.vue'
import BaseTable from '../../components/common/BaseTable.vue'
import EmptyState from '../../components/common/EmptyState.vue'
import LoadingSpinner from '../../components/common/LoadingSpinner.vue'
import { useAdminClient } from '../../composables/useAdminClient'
import { useCurrency } from '../../composables/useCurrency'
import {
  experienceLabel,
  objectiveLabel,
} from '../../constants/questionnaireEnums'

const props = defineProps({
  id: {
    type: String,
    required: true,
  },
})

const {
  profile,
  role,
  purchases,
  questionnaires,
  routines,
  pendingRoutinePurchases,
  loading,
  error,
  load,
} = useAdminClient()
const { formatCurrency } = useCurrency()

const PURCHASE_STATUS_META = {
  approved: { variant: 'success', label: 'Aprobada' },
  pending: { variant: 'warning', label: 'Pendiente' },
  rejected: { variant: 'danger', label: 'Rechazada' },
  cancelled: { variant: 'neutral', label: 'Cancelada' },
  refunded: { variant: 'info', label: 'Reembolsada' },
}

const ROUTINE_STATUS_META = {
  assigned: { variant: 'success', label: 'Asignada' },
  draft: { variant: 'neutral', label: 'Borrador' },
  archived: { variant: 'neutral', label: 'Archivada' },
}

function purchaseStatusMeta(status) {
  return PURCHASE_STATUS_META[status] ?? { variant: 'neutral', label: status ?? '—' }
}

function routineStatusMeta(status) {
  return ROUTINE_STATUS_META[status] ?? { variant: 'neutral', label: status ?? '—' }
}

function formatDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' }).format(new Date(value))
}

// El cliente está activo si tiene alguna compra aprobada vigente (misma regla
// que la lista de clientes / dashboard).
const isActive = computed(() => {
  const now = Date.now()
  return purchases.value.some((purchase) => {
    if (purchase.payment_status !== 'approved') return false
    if (!purchase.end_date) return true
    return new Date(purchase.end_date).getTime() > now
  })
})

const purchaseColumns = [
  { key: 'package_name', label: 'Paquete' },
  { key: 'amount', label: 'Precio', align: 'right' },
  { key: 'payment_status', label: 'Estado', align: 'center' },
  { key: 'created_at', label: 'Fecha', align: 'right' },
  { key: 'end_date', label: 'Vence', align: 'right' },
]

const routineColumns = [
  { key: 'name', label: 'Rutina' },
  { key: 'status', label: 'Estado', align: 'center' },
  { key: 'assigned_at', label: 'Asignada', align: 'right' },
]

onMounted(() => load(props.id))
watch(
  () => props.id,
  (id) => load(id),
)
</script>

<template>
  <div class="mx-auto max-w-5xl">
    <RouterLink
      class="focus-ring inline-flex items-center rounded-sm text-sm font-semibold text-brand-blue transition hover:underline"
      :to="{ name: 'admin-clients' }"
    >
      ← Volver a clientes
    </RouterLink>

    <div class="mt-4">
      <LoadingSpinner v-if="loading" label="Cargando cliente" />

      <div v-else-if="error" class="rounded-xl border border-border-subtle bg-surface-raised p-6 shadow-sm">
        <p class="text-sm text-danger" role="alert">{{ error }}</p>
        <BaseButton class="mt-4" type="button" variant="secondary" @click="load(props.id)">
          Recargar
        </BaseButton>
      </div>

      <EmptyState
        v-else-if="!profile"
        title="Cliente no encontrado"
        description="Este cliente no existe o no tienes permiso para verlo."
      />

      <template v-else>
        <p class="text-sm font-bold text-brand-blue">FICHA DEL CLIENTE</p>
        <h1 class="mt-2 text-3xl font-black tracking-tight">
          {{ profile.full_name ?? 'Cliente sin nombre' }}
        </h1>

        <!-- Datos del cliente + estado actual -->
        <BaseCard class="mt-6">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <h2 class="text-lg font-bold">Datos del cliente</h2>
            <BaseBadge :variant="isActive ? 'success' : 'neutral'">
              {{ isActive ? 'Activo' : 'Inactivo' }}
            </BaseBadge>
          </div>
          <dl class="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <dt class="text-xs font-semibold uppercase tracking-wide text-faint">Correo</dt>
              <dd class="mt-1 text-sm text-body">{{ profile.email ?? '—' }}</dd>
            </div>
            <div>
              <dt class="text-xs font-semibold uppercase tracking-wide text-faint">Teléfono</dt>
              <dd class="mt-1 text-sm text-body">{{ profile.phone ?? '—' }}</dd>
            </div>
            <div>
              <dt class="text-xs font-semibold uppercase tracking-wide text-faint">Rol</dt>
              <dd class="mt-1 text-sm text-body">
                {{ role === 'admin' ? 'Administrador' : 'Cliente' }}
              </dd>
            </div>
            <div>
              <dt class="text-xs font-semibold uppercase tracking-wide text-faint">Registro</dt>
              <dd class="mt-1 text-sm text-body">{{ formatDate(profile.created_at) }}</dd>
            </div>
          </dl>
        </BaseCard>

        <!-- Historial de compras -->
        <section class="mt-8">
          <h2 class="text-xl font-black tracking-tight">Historial de compras</h2>
          <div class="mt-4">
            <BaseTable
              :columns="purchaseColumns"
              :rows="purchases"
              empty-title="Sin compras"
              empty-description="Este cliente aún no tiene compras registradas."
            >
              <template #cell-package_name="{ value }">
                <span class="font-medium text-body">{{ value ?? '—' }}</span>
              </template>
              <template #cell-amount="{ row }">
                {{ formatCurrency(row.amount, row.currency) }}
              </template>
              <template #cell-payment_status="{ value }">
                <BaseBadge :variant="purchaseStatusMeta(value).variant">
                  {{ purchaseStatusMeta(value).label }}
                </BaseBadge>
              </template>
              <template #cell-created_at="{ value }">{{ formatDate(value) }}</template>
              <template #cell-end_date="{ value }">{{ formatDate(value) }}</template>
            </BaseTable>
          </div>
        </section>

        <!-- Cuestionarios contestados -->
        <section class="mt-8">
          <h2 class="text-xl font-black tracking-tight">Cuestionarios contestados</h2>
          <div class="mt-4">
            <EmptyState
              v-if="questionnaires.length === 0"
              title="Sin cuestionarios"
              description="Este cliente aún no ha completado ningún cuestionario."
            />
            <ul v-else class="space-y-4">
              <li v-for="questionnaire in questionnaires" :key="questionnaire.id">
                <BaseCard>
                  <dl class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <dt class="text-xs font-semibold uppercase tracking-wide text-faint">Objetivo</dt>
                      <dd class="mt-1 text-sm text-body">{{ objectiveLabel(questionnaire.objective) }}</dd>
                    </div>
                    <div>
                      <dt class="text-xs font-semibold uppercase tracking-wide text-faint">Nivel</dt>
                      <dd class="mt-1 text-sm text-body">
                        {{ experienceLabel(questionnaire.experience_level) }}
                      </dd>
                    </div>
                    <div>
                      <dt class="text-xs font-semibold uppercase tracking-wide text-faint">
                        Días por semana
                      </dt>
                      <dd class="mt-1 text-sm text-body">
                        {{ questionnaire.days_per_week ?? '—' }}
                      </dd>
                    </div>
                    <div>
                      <dt class="text-xs font-semibold uppercase tracking-wide text-faint">Equipo</dt>
                      <dd class="mt-1 text-sm text-body">
                        {{ questionnaire.equipment_available ?? '—' }}
                      </dd>
                    </div>
                    <div class="sm:col-span-2 lg:col-span-3">
                      <dt class="text-xs font-semibold uppercase tracking-wide text-faint">Lesiones</dt>
                      <dd class="mt-1 text-sm text-body">{{ questionnaire.injuries ?? '—' }}</dd>
                    </div>
                  </dl>
                </BaseCard>
              </li>
            </ul>
          </div>
        </section>

        <!-- Rutinas asignadas -->
        <section class="mt-8">
          <h2 class="text-xl font-black tracking-tight">Rutinas asignadas</h2>
          <div class="mt-4">
            <BaseTable
              :columns="routineColumns"
              :rows="routines"
              empty-title="Sin rutinas"
              empty-description="Este cliente aún no tiene rutinas."
            >
              <template #cell-name="{ value }">
                <span class="font-medium text-body">{{ value ?? '—' }}</span>
              </template>
              <template #cell-status="{ value }">
                <BaseBadge :variant="routineStatusMeta(value).variant">
                  {{ routineStatusMeta(value).label }}
                </BaseBadge>
              </template>
              <template #cell-assigned_at="{ value }">{{ formatDate(value) }}</template>
            </BaseTable>
          </div>
        </section>

        <!-- Estado actual: compras pendientes de rutina -->
        <BaseCard v-if="pendingRoutinePurchases.length > 0" class="mt-8">
          <h2 class="text-lg font-bold">Pendientes de asignar rutina</h2>
          <p class="mt-1 text-sm text-muted">
            Compras aprobadas sin rutina asignada. Crea o asigna la rutina desde cada compra.
          </p>
          <ul class="mt-4 space-y-2">
            <li
              v-for="purchase in pendingRoutinePurchases"
              :key="purchase.id"
              class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-subtle bg-surface-raised px-4 py-3"
            >
              <div class="flex items-center gap-3">
                <span class="font-medium text-body">{{ purchase.package_name ?? '—' }}</span>
                <BaseBadge variant="warning">Rutina pendiente</BaseBadge>
              </div>
              <!--
                El constructor recibe userId + purchaseId por query (mismo patrón
                que AdminQuestionnairesView); si esa compra ya tiene rutina,
                redirige a editarla (una-rutina-por-compra).
              -->
              <RouterLink
                :to="{
                  name: 'admin-routine-create',
                  query: { userId: props.id, purchaseId: purchase.id },
                }"
              >
                <BaseButton type="button">Crear/asignar rutina</BaseButton>
              </RouterLink>
            </li>
          </ul>
        </BaseCard>
      </template>
    </div>
  </div>
</template>
