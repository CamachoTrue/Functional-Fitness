<script setup>
import { RouterLink } from 'vue-router'

import { useCurrency } from '../../composables/useCurrency'
import BaseBadge from '../common/BaseBadge.vue'
import BaseButton from '../common/BaseButton.vue'
import BaseTable from '../common/BaseTable.vue'

/**
 * Tabla de administración del catálogo de paquetes. Muestra precio (formateado
 * con useCurrency), duración, recomendado/activo con badges y acciones: editar
 * (RouterLink a admin-package-edit) y activar/desactivar (los paquetes NO se
 * borran en duro). El toggle se delega al padre vía evento `toggle-active`.
 */
defineProps({
  packages: {
    type: Array,
    default: () => [],
  },
  saving: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['toggle-active'])

const { formatCurrency } = useCurrency()

const columns = [
  { key: 'name', label: 'Paquete' },
  { key: 'price', label: 'Precio', align: 'right' },
  { key: 'duration_days', label: 'Duración', align: 'right' },
  { key: 'is_recommended', label: 'Recomendado', align: 'center' },
  { key: 'is_active', label: 'Estado', align: 'center' },
  { key: 'actions', label: '', align: 'right' },
]

function toggleActive(pkg) {
  emit('toggle-active', { id: pkg.id, isActive: !pkg.is_active })
}
</script>

<template>
  <BaseTable
    :columns="columns"
    :rows="packages"
    empty-title="Aún no hay paquetes"
    empty-description="Crea tu primer paquete para mostrarlo en el catálogo."
  >
    <template #cell-name="{ value }">
      <span class="font-medium text-body">{{ value ?? '—' }}</span>
    </template>
    <template #cell-price="{ row }">
      {{ formatCurrency(row.price, row.currency) }}
    </template>
    <template #cell-duration_days="{ value }">{{ value }} días</template>
    <template #cell-is_recommended="{ value }">
      <BaseBadge :variant="value ? 'success' : 'neutral'">
        {{ value ? 'Sí' : 'No' }}
      </BaseBadge>
    </template>
    <template #cell-is_active="{ value }">
      <BaseBadge :variant="value ? 'success' : 'neutral'">
        {{ value ? 'Activo' : 'Inactivo' }}
      </BaseBadge>
    </template>
    <template #cell-actions="{ row }">
      <div class="flex items-center justify-end gap-2">
        <RouterLink
          class="focus-ring inline-flex items-center rounded-md px-3 py-1.5 text-sm font-semibold text-brand-blue transition hover:underline"
          :to="{ name: 'admin-package-edit', params: { id: row.id } }"
        >
          Editar
        </RouterLink>
        <BaseButton
          type="button"
          variant="secondary"
          :disabled="saving"
          @click="toggleActive(row)"
        >
          {{ row.is_active ? 'Desactivar' : 'Activar' }}
        </BaseButton>
      </div>
    </template>
  </BaseTable>
</template>
