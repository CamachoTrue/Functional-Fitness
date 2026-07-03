<script setup>
import { onMounted } from 'vue'

import { RouterLink } from 'vue-router'

import BaseBadge from '../../components/common/BaseBadge.vue'
import BaseButton from '../../components/common/BaseButton.vue'
import BaseTable from '../../components/common/BaseTable.vue'
import LoadingSpinner from '../../components/common/LoadingSpinner.vue'
import { useAdminQuestionnaires } from '../../composables/useAdminQuestionnaires'
import { experienceLabel, objectiveLabel } from '../../constants/questionnaireEnums'

const { questionnaires, loading, error, load } = useAdminQuestionnaires()

// Estado de la compra en español para el badge. Solo `approved` habilita crear
// rutina; el resto se muestra en tono neutro con su etiqueta traducida.
const PURCHASE_STATUS_META = {
  approved: { variant: 'success', label: 'Aprobada' },
  pending: { variant: 'neutral', label: 'Pendiente' },
  rejected: { variant: 'neutral', label: 'Rechazada' },
  cancelled: { variant: 'neutral', label: 'Cancelada' },
  refunded: { variant: 'neutral', label: 'Reembolsada' },
  expired: { variant: 'neutral', label: 'Vencida' },
}

function purchaseStatusMeta(status) {
  return PURCHASE_STATUS_META[status] ?? { variant: 'neutral', label: status ?? '—' }
}

const columns = [
  { key: 'client', label: 'Cliente' },
  { key: 'package_name', label: 'Compra' },
  { key: 'objective', label: 'Objetivo' },
  { key: 'experience_level', label: 'Nivel' },
  { key: 'days_per_week', label: 'Días', align: 'center' },
  { key: 'equipment_available', label: 'Equipo' },
  { key: 'injuries', label: 'Lesiones' },
  { key: 'actions', label: '', align: 'right' },
]

onMounted(load)
</script>

<template>
  <div class="mx-auto max-w-6xl">
    <p class="text-sm font-bold text-brand-green">EVALUACIONES</p>
    <h1 class="mt-2 text-3xl font-black tracking-tight">Cuestionarios</h1>
    <p class="mt-2 text-sm text-muted">
      Cuestionarios contestados por los clientes. Desde una compra aprobada puedes crear o asignar su rutina.
    </p>

    <div class="mt-8">
      <LoadingSpinner v-if="loading" label="Cargando cuestionarios" />

      <div v-else-if="error" class="rounded-xl border border-border-subtle bg-surface-raised p-6 shadow-sm">
        <p class="text-sm text-danger" role="alert">{{ error }}</p>
        <BaseButton class="mt-4" type="button" variant="secondary" @click="load">
          Recargar
        </BaseButton>
      </div>

      <BaseTable
        v-else
        :columns="columns"
        :rows="questionnaires"
        empty-title="Aún no hay cuestionarios"
        empty-description="Cuando un cliente complete su cuestionario aparecerá aquí."
      >
        <template #cell-client="{ row }">
          <span class="font-medium text-body">{{ row.client_name ?? '—' }}</span>
          <span class="block text-xs text-faint">{{ row.client_email ?? '—' }}</span>
        </template>
        <template #cell-package_name="{ row }">
          <span>{{ row.package_name ?? '—' }}</span>
          <BaseBadge
            v-if="row.purchase_status"
            class="ml-2"
            :variant="purchaseStatusMeta(row.purchase_status).variant"
          >
            {{ purchaseStatusMeta(row.purchase_status).label }}
          </BaseBadge>
        </template>
        <template #cell-objective="{ value }">{{ objectiveLabel(value) }}</template>
        <template #cell-experience_level="{ value }">{{ experienceLabel(value) }}</template>
        <template #cell-days_per_week="{ value }">{{ value ?? '—' }}</template>
        <template #cell-equipment_available="{ value }">{{ value ?? '—' }}</template>
        <template #cell-injuries="{ value }">{{ value ?? '—' }}</template>
        <template #cell-actions="{ row }">
          <!--
            Solo con la compra aprobada tiene sentido crear/asignar la rutina (el
            trigger validate_assigned_routine exige una compra approved). El
            constructor recibe userId + purchaseId por query y, si esa compra ya
            tiene rutina, redirige a editarla (una-rutina-por-compra).
          -->
          <RouterLink
            v-if="row.purchase_status === 'approved'"
            :to="{
              name: 'admin-routine-create',
              query: { userId: row.user_id, purchaseId: row.purchase_id },
            }"
          >
            <BaseButton type="button">Crear/asignar rutina</BaseButton>
          </RouterLink>
          <BaseButton v-else type="button" variant="secondary" disabled>
            Requiere compra aprobada
          </BaseButton>
        </template>
      </BaseTable>
    </div>
  </div>
</template>
