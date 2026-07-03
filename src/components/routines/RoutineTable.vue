<script setup>
import { RouterLink } from 'vue-router'

import BaseBadge from '../common/BaseBadge.vue'
import BaseTable from '../common/BaseTable.vue'

/**
 * Tabla de administración de rutinas. Muestra cliente (nombre + correo), nombre
 * de la rutina, estado (badge draft/assigned/archived con etiqueta en español),
 * fecha de asignación (o creación si aún no está asignada) y la acción de editar
 * (RouterLink a admin-routine-edit). Solo usa componentes base.
 */
defineProps({
  routines: {
    type: Array,
    default: () => [],
  },
})

const STATUS_META = {
  draft: { variant: 'neutral', label: 'Borrador' },
  assigned: { variant: 'success', label: 'Asignada' },
  archived: { variant: 'warning', label: 'Archivada' },
}

function statusMeta(status) {
  return STATUS_META[status] ?? { variant: 'neutral', label: status ?? '—' }
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })
}

const columns = [
  { key: 'client', label: 'Cliente' },
  { key: 'name', label: 'Rutina' },
  { key: 'status', label: 'Estado', align: 'center' },
  { key: 'date', label: 'Fecha', align: 'center' },
  { key: 'actions', label: '', align: 'right' },
]
</script>

<template>
  <BaseTable
    :columns="columns"
    :rows="routines"
    empty-title="Aún no hay rutinas"
    empty-description="Crea una rutina o asígnala desde un cuestionario aprobado."
  >
    <template #cell-client="{ row }">
      <span class="font-medium text-body">{{ row.client_name ?? '—' }}</span>
      <span class="block text-xs text-faint">{{ row.client_email ?? '—' }}</span>
    </template>
    <template #cell-name="{ value }">
      <span class="font-medium text-body">{{ value ?? '—' }}</span>
    </template>
    <template #cell-status="{ value }">
      <BaseBadge :variant="statusMeta(value).variant">{{ statusMeta(value).label }}</BaseBadge>
    </template>
    <template #cell-date="{ row }">
      {{ formatDate(row.assigned_at ?? row.created_at) }}
    </template>
    <template #cell-actions="{ row }">
      <RouterLink
        class="focus-ring inline-flex items-center rounded-md px-3 py-1.5 text-sm font-semibold text-brand-green transition hover:underline"
        :to="{ name: 'admin-routine-edit', params: { id: row.id } }"
      >
        Editar
      </RouterLink>
    </template>
  </BaseTable>
</template>
