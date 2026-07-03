<script setup>
import { onMounted } from 'vue'
import { RouterLink } from 'vue-router'

import BaseButton from '../../components/common/BaseButton.vue'
import EmptyState from '../../components/common/EmptyState.vue'
import LoadingSpinner from '../../components/common/LoadingSpinner.vue'
import QuestionnaireForm from '../../components/questionnaire/QuestionnaireForm.vue'
import { useQuestionnaire } from '../../composables/useQuestionnaire'
import { useAuthStore } from '../../stores/authStore'

const props = defineProps({
  purchaseId: {
    type: String,
    required: true,
  },
})

const auth = useAuthStore()

const {
  purchase,
  loading,
  saving,
  error,
  saveError,
  saved,
  form,
  errors,
  isCompleted,
  isApproved,
  load,
  submit,
} = useQuestionnaire()

function reload() {
  load(props.purchaseId)
}

async function handleSubmit() {
  await submit(auth.user?.id)
}

onMounted(reload)
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <p class="text-sm font-bold text-brand-green">TU EVALUACIÓN</p>
    <h1 class="mt-2 text-3xl font-black tracking-tight">Cuestionario de evaluación</h1>

    <div class="mt-8">
      <LoadingSpinner v-if="loading" label="Cargando tu cuestionario" />

      <!-- Error de red al cargar: mensaje en español + posibilidad de recargar. -->
      <div v-else-if="error" class="rounded-xl border border-border-subtle bg-surface-raised p-6 shadow-sm">
        <p class="text-sm text-danger" role="alert">{{ error }}</p>
        <BaseButton class="mt-4" type="button" variant="secondary" @click="reload">
          Recargar
        </BaseButton>
      </div>

      <!-- Compra inexistente, no visible o no approved: sin formulario (refleja
           en la UI la barrera de RLS). -->
      <EmptyState
        v-else-if="!purchase || !isApproved"
        title="Esta compra no admite cuestionario"
        description="Solo puedes completar el cuestionario de una compra confirmada. Revisa tus compras para continuar."
      >
        <RouterLink
          class="focus-ring inline-flex min-h-11 items-center justify-center rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition hover:bg-accent-hover"
          to="/client/dashboard"
        >
          Ir a mi panel
        </RouterLink>
      </EmptyState>

      <template v-else>
        <div class="flex items-center gap-3">
          <span
            class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
            :class="
              isCompleted
                ? 'bg-brand-green/10 text-brand-green'
                : 'bg-surface-muted text-muted'
            "
          >
            {{ isCompleted ? 'COMPLETADO' : 'PENDIENTE' }}
          </span>
          <p class="text-sm text-muted">
            Paquete: <span class="font-semibold text-body">{{ purchase.package_name }}</span>
          </p>
        </div>

        <p
          v-if="saved"
          class="mt-5 rounded-md border border-brand-green/30 bg-brand-green/10 px-4 py-3 text-sm text-body"
          role="status"
        >
          Guardamos tu cuestionario. Puedes seguir editándolo cuando lo necesites.
        </p>

        <div class="mt-6">
          <QuestionnaireForm
            v-model="form"
            :errors="errors"
            :saving="saving"
            :is-completed="isCompleted"
            :save-error="saveError || ''"
            @submit="handleSubmit"
          />
        </div>
      </template>
    </div>
  </div>
</template>
