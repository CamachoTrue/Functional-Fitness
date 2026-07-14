<script setup>
import { RouterLink } from 'vue-router'

import BaseBadge from '../common/BaseBadge.vue'
import BaseButton from '../common/BaseButton.vue'
import BaseTable from '../common/BaseTable.vue'

/**
 * Tabla de administración de ejercicios. Muestra nombre, categoría, grupo
 * muscular, nivel (badge con etiqueta en español) y si tiene video. Acciones:
 * editar (RouterLink a admin-exercise-edit) y eliminar (con confirmación nativa,
 * delegada al padre vía `delete`). El error de eliminación (p. ej. "en uso") se
 * muestra visualmente por encima de la tabla.
 */
defineProps({
  exercises: {
    type: Array,
    default: () => [],
  },
  saving: {
    type: Boolean,
    default: false,
  },
  deleteError: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['delete'])

const LEVEL_META = {
  basic: { variant: 'success', label: 'Básico' },
  intermediate: { variant: 'info', label: 'Intermedio' },
  advanced: { variant: 'warning', label: 'Avanzado' },
}

function levelMeta(level) {
  return LEVEL_META[level] ?? { variant: 'neutral', label: level ?? '—' }
}

const columns = [
  { key: 'name', label: 'Ejercicio' },
  { key: 'category', label: 'Categoría' },
  { key: 'muscle_group', label: 'Grupo muscular' },
  { key: 'level', label: 'Nivel', align: 'center' },
  { key: 'video', label: 'Video', align: 'center' },
  { key: 'actions', label: '', align: 'right' },
]

function confirmDelete(exercise) {
  const ok = window.confirm(`¿Eliminar el ejercicio "${exercise.name}"? Esta acción no se puede deshacer.`)
  if (ok) emit('delete', exercise)
}
</script>

<template>
  <div>
    <p v-if="deleteError" class="mb-4 text-sm text-danger" role="alert">{{ deleteError }}</p>

    <BaseTable
      :columns="columns"
      :rows="exercises"
      empty-title="Aún no hay ejercicios"
      empty-description="Crea tu primer ejercicio para construir rutinas."
    >
      <template #cell-name="{ value }">
        <span class="font-medium text-body">{{ value ?? '—' }}</span>
      </template>
      <template #cell-category="{ value }">{{ value ?? '—' }}</template>
      <template #cell-muscle_group="{ value }">{{ value ?? '—' }}</template>
      <template #cell-level="{ value }">
        <BaseBadge :variant="levelMeta(value).variant">{{ levelMeta(value).label }}</BaseBadge>
      </template>
      <template #cell-video="{ row }">
        <BaseBadge :variant="row.video_path ? 'success' : 'neutral'">
          {{ row.video_path ? 'Con video' : 'Sin video' }}
        </BaseBadge>
      </template>
      <template #cell-actions="{ row }">
        <div class="flex items-center justify-end gap-2">
          <RouterLink
            class="focus-ring inline-flex items-center rounded-md px-3 py-1.5 text-sm font-semibold text-brand-blue transition hover:underline"
            :to="{ name: 'admin-exercise-edit', params: { id: row.id } }"
          >
            Editar
          </RouterLink>
          <BaseButton
            type="button"
            variant="secondary"
            :disabled="saving"
            @click="confirmDelete(row)"
          >
            Eliminar
          </BaseButton>
        </div>
      </template>
    </BaseTable>
  </div>
</template>
