<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import BaseBadge from '../../components/common/BaseBadge.vue'
import BaseButton from '../../components/common/BaseButton.vue'
import BaseCard from '../../components/common/BaseCard.vue'
import BaseInput from '../../components/common/BaseInput.vue'
import EmptyState from '../../components/common/EmptyState.vue'
import LoadingSpinner from '../../components/common/LoadingSpinner.vue'
import RoutineBuilder from '../../components/routines/RoutineBuilder.vue'
import { useRoutineBuilder } from '../../composables/useRoutineBuilder'
import { fetchRoutineByPurchaseId } from '../../services/routineService'

/**
 * Vista de creación y edición del constructor de rutinas. El modo lo determina
 * la presencia de la prop `id` (ruta admin-routine-edit).
 *
 * CREAR (admin-routine-create): lee userId/purchaseId de la query (viene del
 * botón de cuestionarios). ANTES de crear, si hay purchaseId, comprueba con
 * fetchRoutineByPurchaseId si esa compra YA tiene rutina (una-rutina-por-compra):
 * si existe, redirige a editarla en vez de intentar crear una segunda (que
 * violaría routines_purchase_id_key). El admin confirma el nombre y crea la
 * rutina, que pasa a modo edición.
 *
 * EDITAR: carga la rutina con su contenido y muestra el RoutineBuilder + el
 * panel de estado. El botón "Asignar rutina" solo aparece en status='draft' y
 * traduce el error no_approved_purchase a un mensaje claro.
 */
const props = defineProps({
  id: {
    type: String,
    default: '',
  },
})

const route = useRoute()
const router = useRouter()

const {
  routine,
  loading,
  error,
  saving,
  load,
  create,
  updateMeta,
  addDay,
  editDay,
  removeDay,
  addExercise,
  editExercise,
  removeExercise,
  moveDay,
  moveExercise,
  assign,
} = useRoutineBuilder()

const isEdit = computed(() => Boolean(props.id))

// --- Modo edición: carga la rutina existente ---
const notFound = ref(false)

async function loadRoutine() {
  notFound.value = false
  await load(props.id)
  if (!error.value && !routine.value) {
    notFound.value = true
  }
}

// --- Modo creación: query params + pre-check de una-rutina-por-compra ---
const createUserId = computed(() => route.query.userId ?? '')
const createPurchaseId = computed(() => route.query.purchaseId ?? null)

const checkingExisting = ref(false)
const createName = ref('')
const createError = ref('')

async function prepareCreate() {
  if (!createUserId.value) {
    createError.value = 'Falta el cliente (userId) para crear la rutina.'
    return
  }
  // Si la compra ya tiene rutina, editamos la existente (una rutina por compra).
  if (createPurchaseId.value) {
    checkingExisting.value = true
    try {
      const existing = await fetchRoutineByPurchaseId(createPurchaseId.value)
      if (existing) {
        router.replace({ name: 'admin-routine-edit', params: { id: existing.id } })
        return
      }
    } catch {
      createError.value =
        'No pudimos verificar si esta compra ya tiene una rutina. Intenta de nuevo.'
    } finally {
      checkingExisting.value = false
    }
  }
}

async function handleCreate() {
  createError.value = ''
  const name = createName.value.trim()
  if (!name) {
    createError.value = 'Escribe un nombre para la rutina.'
    return
  }
  try {
    const created = await create({
      userId: createUserId.value,
      purchaseId: createPurchaseId.value,
      name,
    })
    // Pasa a modo edición navegando a la rutina recién creada.
    router.replace({ name: 'admin-routine-edit', params: { id: created.id } })
  } catch {
    // useRoutineBuilder ya expone el mensaje en `error`.
  }
}

// --- Estado de la rutina (edición) ---
const STATUS_META = {
  draft: { variant: 'neutral', label: 'Borrador' },
  assigned: { variant: 'success', label: 'Asignada' },
  archived: { variant: 'warning', label: 'Archivada' },
}

function statusMeta(status) {
  return STATUS_META[status] ?? { variant: 'neutral', label: status ?? '—' }
}

async function handleAssign() {
  try {
    await assign()
  } catch {
    // El mensaje (incluido no_approved_purchase) ya se muestra vía `error`.
  }
}

// Cargar la rutina cada vez que cambia el id (incluye la transición
// create→edit por router.replace, que reusa este mismo componente y NO
// vuelve a disparar onMounted).
watch(
  () => props.id,
  (id) => {
    if (id) loadRoutine()
  },
  { immediate: true },
)

onMounted(() => {
  if (!isEdit.value) prepareCreate()
})
</script>

<template>
  <div class="mx-auto max-w-4xl">
    <RouterLink
      class="focus-ring inline-flex items-center rounded-sm text-sm font-semibold text-brand-green transition hover:underline"
      :to="{ name: 'admin-routines' }"
    >
      ← Volver a rutinas
    </RouterLink>

    <!-- MODO CREACIÓN -->
    <template v-if="!isEdit">
      <h1 class="mt-4 text-3xl font-black tracking-tight">Nueva rutina</h1>

      <div class="mt-8">
        <LoadingSpinner v-if="checkingExisting" label="Verificando compra" />

        <template v-else>
          <p v-if="createError" class="mb-4 text-sm text-red-700" role="alert">
            {{ createError }}
          </p>
          <p v-if="error" class="mb-4 text-sm text-red-700" role="alert">{{ error }}</p>

          <BaseCard v-if="createUserId">
            <h2 class="text-lg font-bold">Detalles de la rutina</h2>
            <p class="mt-1 text-sm text-neutral-600">
              Ponle un nombre para empezar a construir los días y ejercicios.
            </p>
            <div class="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <BaseInput
                id="create-routine-name"
                v-model="createName"
                label="Nombre de la rutina"
                placeholder="Ej. Fuerza general - 4 días"
                :disabled="saving"
                @keyup.enter="handleCreate"
              />
              <BaseButton type="button" :disabled="saving || !createName.trim()" @click="handleCreate">
                Crear rutina
              </BaseButton>
            </div>
          </BaseCard>

          <EmptyState
            v-else
            title="Falta el cliente"
            description="Para crear una rutina abre el constructor desde un cuestionario con compra aprobada."
          />
        </template>
      </div>
    </template>

    <!-- MODO EDICIÓN -->
    <template v-else>
      <h1 class="mt-4 text-3xl font-black tracking-tight">Editar rutina</h1>

      <div class="mt-8">
        <LoadingSpinner v-if="loading" label="Cargando rutina" />

        <div
          v-else-if="error && !routine"
          class="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm"
        >
          <p class="text-sm text-red-700" role="alert">{{ error }}</p>
          <BaseButton class="mt-4" type="button" variant="secondary" @click="loadRoutine">
            Recargar
          </BaseButton>
        </div>

        <EmptyState
          v-else-if="notFound"
          title="Rutina no encontrada"
          description="Esta rutina no existe o no tienes permiso para verla."
        />

        <template v-else-if="routine">
          <BaseCard class="mb-6">
            <div class="flex flex-wrap items-center justify-between gap-4">
              <div class="flex items-center gap-3">
                <span class="text-sm font-semibold text-neutral-800">Estado:</span>
                <BaseBadge :variant="statusMeta(routine.status).variant">
                  {{ statusMeta(routine.status).label }}
                </BaseBadge>
              </div>
              <BaseButton
                v-if="routine.status === 'draft'"
                type="button"
                :disabled="saving"
                @click="handleAssign"
              >
                Asignar rutina
              </BaseButton>
            </div>
            <p v-if="error" class="mt-3 text-sm text-red-700" role="alert">{{ error }}</p>
          </BaseCard>

          <RoutineBuilder
            :routine="routine"
            :saving="saving"
            @update-meta="updateMeta($event)"
            @add-day="addDay($event)"
            @update-day="editDay($event.dayId, $event.fields)"
            @move-day="moveDay($event.dayId, $event.direction)"
            @remove-day="removeDay($event)"
            @add-exercise="addExercise($event.dayId, { exercise: $event.exercise })"
            @update-exercise="editExercise($event.dayId, $event.exerciseRowId, $event.fields)"
            @move-exercise="moveExercise($event.dayId, $event.exerciseRowId, $event.direction)"
            @remove-exercise="removeExercise($event.dayId, $event.exerciseRowId)"
          />
        </template>
      </div>
    </template>
  </div>
</template>
