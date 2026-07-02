<script setup>
import { onMounted } from 'vue'

import BaseBadge from '../../components/common/BaseBadge.vue'
import BaseButton from '../../components/common/BaseButton.vue'
import BaseCard from '../../components/common/BaseCard.vue'
import BaseTable from '../../components/common/BaseTable.vue'
import EmptyState from '../../components/common/EmptyState.vue'
import LoadingSpinner from '../../components/common/LoadingSpinner.vue'
import { useAdminDashboard } from '../../composables/useAdminDashboard'
import { useCurrency } from '../../composables/useCurrency'

const { metrics, latestPurchases, topPackages, loading, error, load } = useAdminDashboard()
const { formatCurrency } = useCurrency()

// Mapea el payment_status de una compra a una variante/etiqueta de BaseBadge.
const STATUS_META = {
  approved: { variant: 'success', label: 'Aprobada' },
  pending: { variant: 'warning', label: 'Pendiente' },
  rejected: { variant: 'danger', label: 'Rechazada' },
  cancelled: { variant: 'neutral', label: 'Cancelada' },
  refunded: { variant: 'info', label: 'Reembolsada' },
}

function statusMeta(status) {
  return STATUS_META[status] ?? { variant: 'neutral', label: status ?? '—' }
}

function formatDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' }).format(new Date(value))
}

const latestColumns = [
  { key: 'client', label: 'Cliente' },
  { key: 'package_name', label: 'Paquete' },
  { key: 'amount', label: 'Monto', align: 'right' },
  { key: 'payment_status', label: 'Estado', align: 'center' },
  { key: 'created_at', label: 'Fecha', align: 'right' },
]

onMounted(load)
</script>

<template>
  <div class="mx-auto max-w-6xl">
    <p class="text-sm font-bold text-brand-green">CONTROL GENERAL</p>
    <h1 class="mt-2 text-3xl font-black tracking-tight">Dashboard</h1>
    <p class="mt-2 text-sm text-neutral-600">
      Resumen de la actividad del negocio. Cliente activo: con compra aprobada vigente.
      Rutina pendiente: compra aprobada sin rutina asignada.
    </p>

    <div class="mt-8">
      <LoadingSpinner v-if="loading" label="Cargando el panel" />

      <div v-else-if="error" class="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <p class="text-sm text-red-700" role="alert">{{ error }}</p>
        <BaseButton class="mt-4" type="button" variant="secondary" @click="load">
          Recargar
        </BaseButton>
      </div>

      <template v-else>
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <BaseCard>
            <p class="text-sm text-neutral-600">Ventas del mes</p>
            <p class="mt-3 text-3xl font-black">
              {{ formatCurrency(metrics.revenueThisMonth, metrics.revenueCurrency) }}
            </p>
            <p class="mt-1 text-xs text-neutral-500">
              {{ metrics.approvedThisMonth }} compras aprobadas
            </p>
          </BaseCard>
          <BaseCard>
            <p class="text-sm text-neutral-600">Clientes activos</p>
            <p class="mt-3 text-3xl font-black">{{ metrics.activeClients }}</p>
          </BaseCard>
          <BaseCard>
            <p class="text-sm text-neutral-600">Compras pendientes</p>
            <p class="mt-3 text-3xl font-black">{{ metrics.pendingPurchases }}</p>
          </BaseCard>
          <BaseCard>
            <p class="text-sm text-neutral-600">Rutinas pendientes</p>
            <p class="mt-3 text-3xl font-black">{{ metrics.pendingRoutines }}</p>
          </BaseCard>
        </div>

        <section class="mt-10">
          <h2 class="text-xl font-black tracking-tight">Últimas compras</h2>
          <div class="mt-4">
            <BaseTable
              :columns="latestColumns"
              :rows="latestPurchases"
              empty-title="Aún no hay compras"
              empty-description="Cuando se registre una compra aparecerá aquí."
            >
              <template #cell-client="{ row }">
                <span class="font-medium text-neutral-900">
                  {{ row.package_name ?? '—' }}
                </span>
                <span class="block text-xs text-neutral-500">{{ row.user_id }}</span>
              </template>
              <template #cell-package_name="{ value }">{{ value ?? '—' }}</template>
              <template #cell-amount="{ row }">
                {{ formatCurrency(row.amount, row.currency) }}
              </template>
              <template #cell-payment_status="{ value }">
                <BaseBadge :variant="statusMeta(value).variant">
                  {{ statusMeta(value).label }}
                </BaseBadge>
              </template>
              <template #cell-created_at="{ value }">{{ formatDate(value) }}</template>
            </BaseTable>
          </div>
        </section>

        <section class="mt-10">
          <h2 class="text-xl font-black tracking-tight">Paquetes más vendidos</h2>
          <div class="mt-4">
            <EmptyState
              v-if="topPackages.length === 0"
              title="Sin ventas registradas"
              description="Aquí verás los paquetes más vendidos cuando existan compras aprobadas."
            />
            <ul v-else class="space-y-2">
              <li
                v-for="pkg in topPackages"
                :key="pkg.name"
                class="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-sm"
              >
                <span class="font-medium text-neutral-900">{{ pkg.name }}</span>
                <BaseBadge variant="neutral">{{ pkg.count }} vendidas</BaseBadge>
              </li>
            </ul>
          </div>
        </section>
      </template>
    </div>
  </div>
</template>
