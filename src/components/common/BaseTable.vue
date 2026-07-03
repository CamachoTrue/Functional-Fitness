<script setup>
import { computed } from 'vue'

import EmptyState from './EmptyState.vue'

/**
 * Tabla accesible y responsive con el estilo de contenedor de BaseCard
 * (border neutral-200, bg-white, rounded-xl, shadow-sm). El scroll horizontal
 * (overflow-x-auto) evita el desbordamiento en móvil sin romper el layout.
 *
 * columns: [{ key, label, align? }] donde align ∈ 'left'|'center'|'right'
 *   (por defecto 'left'). key identifica la propiedad de cada fila y el slot.
 * rows: array de objetos; cada celda muestra row[column.key] salvo que se
 *   provea un slot con nombre #cell-<key> (recibe { row, value }).
 *
 * Estado vacío: si rows está vacío se renderiza el slot #empty o, si no se
 * provee, un EmptyState por defecto.
 */
const props = defineProps({
  columns: {
    type: Array,
    required: true,
  },
  rows: {
    type: Array,
    default: () => [],
  },
  emptyTitle: {
    type: String,
    default: 'Sin resultados',
  },
  emptyDescription: {
    type: String,
    default: '',
  },
  rowKey: {
    type: String,
    default: 'id',
  },
})

const isEmpty = computed(() => props.rows.length === 0)

const ALIGN_CLASSES = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
}

function alignClass(column) {
  return ALIGN_CLASSES[column.align] ?? ALIGN_CLASSES.left
}

function rowIdentifier(row, index) {
  return row?.[props.rowKey] ?? index
}
</script>

<template>
  <div>
    <template v-if="isEmpty">
      <slot name="empty">
        <EmptyState :title="emptyTitle" :description="emptyDescription" />
      </slot>
    </template>

    <div
      v-else
      class="overflow-x-auto rounded-xl border border-border-subtle bg-surface-raised shadow-sm"
    >
      <table class="w-full min-w-full border-collapse text-sm">
        <thead>
          <tr class="border-b border-border-subtle bg-surface-muted">
            <th
              v-for="column in columns"
              :key="column.key"
              scope="col"
              class="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-faint"
              :class="alignClass(column)"
            >
              {{ column.label }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, index) in rows"
            :key="rowIdentifier(row, index)"
            class="border-b border-border-subtle last:border-0 hover:bg-surface-muted"
          >
            <td
              v-for="column in columns"
              :key="column.key"
              class="px-4 py-3 text-body align-middle"
              :class="alignClass(column)"
            >
              <slot :name="`cell-${column.key}`" :row="row" :value="row[column.key]">
                {{ row[column.key] }}
              </slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
