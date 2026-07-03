<script setup>
import { onMounted } from 'vue'

import BaseBadge from '../../components/common/BaseBadge.vue'
import BaseButton from '../../components/common/BaseButton.vue'
import BaseTable from '../../components/common/BaseTable.vue'
import LoadingSpinner from '../../components/common/LoadingSpinner.vue'
import { useAdminPurchases } from '../../composables/useAdminPurchases'
import { useCurrency } from '../../composables/useCurrency'

const { purchases, loading, error, load } = useAdminPurchases()
const { formatCurrency } = useCurrency()

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

const columns = [
  { key: 'client', label: 'Cliente' },
  { key: 'package_name', label: 'Paquete' },
  { key: 'amount', label: 'Precio', align: 'right' },
  { key: 'payment_status', label: 'Estado', align: 'center' },
  { key: 'mercado_pago_payment_id', label: 'ID Mercado Pago' },
  { key: 'created_at', label: 'Fecha', align: 'right' },
  { key: 'start_date', label: 'Inicio', align: 'right' },
  { key: 'end_date', label: 'Vence', align: 'right' },
]

onMounted(load)
</script>

<template>
  <div class="mx-auto max-w-6xl">
    <p class="text-sm font-bold text-brand-green">REGISTRO DE COMPRAS</p>
    <h1 class="mt-2 text-3xl font-black tracking-tight">Compras</h1>
    <p class="mt-2 text-sm text-muted">
      Historial completo de compras en modo solo lectura.
    </p>

    <div class="mt-8">
      <LoadingSpinner v-if="loading" label="Cargando compras" />

      <div v-else-if="error" class="rounded-xl border border-border-subtle bg-surface-raised p-6 shadow-sm">
        <p class="text-sm text-danger" role="alert">{{ error }}</p>
        <BaseButton class="mt-4" type="button" variant="secondary" @click="load">
          Recargar
        </BaseButton>
      </div>

      <BaseTable
        v-else
        :columns="columns"
        :rows="purchases"
        empty-title="Aún no hay compras"
        empty-description="Cuando se registre una compra aparecerá en esta lista."
      >
        <template #cell-client="{ row }">
          <span class="font-medium text-body">{{ row.client_name ?? '—' }}</span>
          <span class="block text-xs text-faint">{{ row.client_email ?? '—' }}</span>
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
        <template #cell-mercado_pago_payment_id="{ value }">
          <span class="font-mono text-xs text-muted">{{ value ?? '—' }}</span>
        </template>
        <template #cell-created_at="{ value }">{{ formatDate(value) }}</template>
        <template #cell-start_date="{ value }">{{ formatDate(value) }}</template>
        <template #cell-end_date="{ value }">{{ formatDate(value) }}</template>
      </BaseTable>
    </div>
  </div>
</template>
