<script setup>
import { computed } from 'vue'

import BaseButton from '../common/BaseButton.vue'
import BaseCard from '../common/BaseCard.vue'
import BaseInput from '../common/BaseInput.vue'
import BaseSelect from '../common/BaseSelect.vue'
import BaseTextarea from '../common/BaseTextarea.vue'
import {
  experienceOptions,
  objectiveOptions,
  scheduleOptions,
  trainingPlaceOptions,
} from '../../constants/questionnaireEnums'

const props = defineProps({
  errors: {
    type: Object,
    default: () => ({}),
  },
  saving: {
    type: Boolean,
    default: false,
  },
  isCompleted: {
    type: Boolean,
    default: false,
  },
  saveError: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['submit'])

// El formulario se enlaza por v-model desde la vista; cada campo se escribe con
// form.campo. Se usa defineModel para no duplicar el estado del composable.
const form = defineModel({ type: Object, required: true })

const daysOptions = Array.from({ length: 7 }, (_, index) => ({
  value: String(index + 1),
  label: String(index + 1),
}))

const submitLabel = computed(() => {
  if (props.saving) return 'Guardando…'
  return props.isCompleted ? 'Actualizar cuestionario' : 'Guardar cuestionario'
})

function handleSubmit() {
  emit('submit')
}
</script>

<template>
  <form class="space-y-6" novalidate @submit.prevent="handleSubmit">
    <BaseCard>
      <h2 class="text-lg font-bold">Objetivo y nivel</h2>
      <p class="mt-1 text-sm text-neutral-600">
        Cuéntanos qué buscas y cuál es tu experiencia entrenando.
      </p>
      <div class="mt-5 grid gap-5 sm:grid-cols-2">
        <BaseSelect
          id="objective"
          v-model="form.objective"
          label="Objetivo principal"
          :options="objectiveOptions"
          :error="errors.objective"
        />
        <BaseSelect
          id="experience_level"
          v-model="form.experience_level"
          label="Nivel de experiencia"
          :options="experienceOptions"
          :error="errors.experience_level"
        />
      </div>
    </BaseCard>

    <BaseCard>
      <h2 class="text-lg font-bold">Datos físicos</h2>
      <p class="mt-1 text-sm text-neutral-600">Nos ayudan a ajustar cargas y progresiones.</p>
      <div class="mt-5 grid gap-5 sm:grid-cols-3">
        <BaseInput
          id="age"
          v-model="form.age"
          label="Edad (años)"
          type="number"
          min="13"
          max="100"
          inputmode="numeric"
          :error="errors.age"
        />
        <BaseInput
          id="weight"
          v-model="form.weight"
          label="Peso (kg)"
          type="number"
          min="0"
          step="0.1"
          inputmode="decimal"
          :error="errors.weight"
        />
        <BaseInput
          id="height"
          v-model="form.height"
          label="Altura (cm)"
          type="number"
          min="0"
          step="0.1"
          inputmode="decimal"
          :error="errors.height"
        />
      </div>
    </BaseCard>

    <BaseCard>
      <h2 class="text-lg font-bold">Salud y lesiones</h2>
      <p class="mt-1 text-sm text-neutral-600">
        Indica cualquier condición que debamos tener en cuenta.
      </p>
      <div class="mt-5 space-y-5">
        <BaseTextarea
          id="injuries"
          v-model="form.injuries"
          label="Lesiones actuales o pasadas"
          :error="errors.injuries"
        />
        <BaseTextarea
          id="medical_notes"
          v-model="form.medical_notes"
          label="Notas médicas"
          :error="errors.medical_notes"
        />
        <BaseTextarea
          id="limitations"
          v-model="form.limitations"
          label="Limitaciones de movimiento"
          :error="errors.limitations"
        />
      </div>
    </BaseCard>

    <BaseCard>
      <h2 class="text-lg font-bold">Logística de entrenamiento</h2>
      <p class="mt-1 text-sm text-neutral-600">Dónde, con qué y cuánto tiempo entrenas.</p>
      <div class="mt-5 grid gap-5 sm:grid-cols-2">
        <BaseSelect
          id="training_place"
          v-model="form.training_place"
          label="Lugar de entrenamiento"
          :options="trainingPlaceOptions"
          :error="errors.training_place"
        />
        <BaseSelect
          id="days_per_week"
          v-model="form.days_per_week"
          label="Días por semana"
          :options="daysOptions"
          :error="errors.days_per_week"
        />
        <BaseInput
          id="time_per_session"
          v-model="form.time_per_session"
          label="Tiempo por sesión (minutos)"
          type="number"
          min="10"
          max="360"
          inputmode="numeric"
          :error="errors.time_per_session"
        />
        <BaseSelect
          id="preferred_schedule"
          v-model="form.preferred_schedule"
          label="Horario preferido"
          :options="scheduleOptions"
          :error="errors.preferred_schedule"
        />
        <div class="sm:col-span-2">
          <BaseTextarea
            id="equipment_available"
            v-model="form.equipment_available"
            label="Equipamiento disponible"
            :error="errors.equipment_available"
          />
        </div>
      </div>
    </BaseCard>

    <BaseCard>
      <h2 class="text-lg font-bold">Notas adicionales</h2>
      <p class="mt-1 text-sm text-neutral-600">Cualquier detalle extra que quieras compartir.</p>
      <div class="mt-5">
        <BaseTextarea
          id="additional_notes"
          v-model="form.additional_notes"
          label="Comentarios adicionales"
          :error="errors.additional_notes"
        />
      </div>
    </BaseCard>

    <p v-if="saveError" class="text-sm text-red-700" role="alert">{{ saveError }}</p>

    <div class="flex justify-end">
      <BaseButton type="submit" :disabled="saving">{{ submitLabel }}</BaseButton>
    </div>
  </form>
</template>
