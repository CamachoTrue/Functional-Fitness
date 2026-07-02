<script setup>
import { onMounted } from 'vue'
import { RouterLink } from 'vue-router'

import BaseBadge from '../../components/common/BaseBadge.vue'
import BaseButton from '../../components/common/BaseButton.vue'
import BaseTable from '../../components/common/BaseTable.vue'
import LoadingSpinner from '../../components/common/LoadingSpinner.vue'
import { useAdminClients } from '../../composables/useAdminClients'

const { clients, loading, error, load } = useAdminClients()

function formatDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' }).format(new Date(value))
}

const columns = [
  { key: 'full_name', label: 'Nombre' },
  { key: 'email', label: 'Correo' },
  { key: 'phone', label: 'Teléfono' },
  { key: 'currentPlan', label: 'Plan actual' },
  { key: 'isActive', label: 'Estado', align: 'center' },
  { key: 'created_at', label: 'Registro', align: 'right' },
  { key: 'actions', label: '', align: 'right' },
]

onMounted(load)
</script>

<template>
  <div class="mx-auto max-w-6xl">
    <p class="text-sm font-bold text-brand-green">GESTIÓN DE CLIENTES</p>
    <h1 class="mt-2 text-3xl font-black tracking-tight">Clientes</h1>
    <p class="mt-2 text-sm text-neutral-600">
      Cliente activo: tiene una compra aprobada vigente. Plan actual: paquete de esa compra.
    </p>

    <div class="mt-8">
      <LoadingSpinner v-if="loading" label="Cargando clientes" />

      <div v-else-if="error" class="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <p class="text-sm text-red-700" role="alert">{{ error }}</p>
        <BaseButton class="mt-4" type="button" variant="secondary" @click="load">
          Recargar
        </BaseButton>
      </div>

      <BaseTable
        v-else
        :columns="columns"
        :rows="clients"
        empty-title="Aún no hay clientes"
        empty-description="Cuando se registre un cliente aparecerá en esta lista."
      >
        <template #cell-full_name="{ value }">
          <span class="font-medium text-neutral-900">{{ value ?? '—' }}</span>
        </template>
        <template #cell-email="{ value }">{{ value ?? '—' }}</template>
        <template #cell-phone="{ value }">{{ value ?? '—' }}</template>
        <template #cell-currentPlan="{ value }">{{ value ?? '—' }}</template>
        <template #cell-isActive="{ value }">
          <BaseBadge :variant="value ? 'success' : 'neutral'">
            {{ value ? 'Activo' : 'Inactivo' }}
          </BaseBadge>
        </template>
        <template #cell-created_at="{ value }">{{ formatDate(value) }}</template>
        <template #cell-actions="{ row }">
          <RouterLink
            class="focus-ring inline-flex items-center rounded-md px-3 py-1.5 text-sm font-semibold text-brand-green transition hover:underline"
            :to="{ name: 'admin-client-detail', params: { id: row.id } }"
          >
            Ver detalle
          </RouterLink>
        </template>
      </BaseTable>
    </div>
  </div>
</template>
