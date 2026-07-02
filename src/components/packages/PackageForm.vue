<script setup>
import { computed, reactive, ref } from 'vue'

import BaseButton from '../common/BaseButton.vue'
import BaseCard from '../common/BaseCard.vue'
import BaseInput from '../common/BaseInput.vue'
import BaseTextarea from '../common/BaseTextarea.vue'

/**
 * Formulario de creación/edición de un paquete. La validación de cliente está
 * alineada con los CHECKs de la tabla packages (price > 0, currency ^[A-Z]{3}$,
 * duration_days > 0, name 1-120). El editor de `includes` mantiene una lista de
 * inputs dinámicos que se colapsa a un array de strings (sin vacíos) al enviar.
 * Emite `submit` con el payload listo para el service.
 */
const props = defineProps({
  initialValue: {
    type: Object,
    default: null,
  },
  saving: {
    type: Boolean,
    default: false,
  },
  submitLabel: {
    type: String,
    default: 'Guardar paquete',
  },
})

const emit = defineEmits(['submit'])

const form = reactive({
  name: props.initialValue?.name ?? '',
  description: props.initialValue?.description ?? '',
  price: props.initialValue?.price != null ? String(props.initialValue.price) : '',
  currency: props.initialValue?.currency ?? 'MXN',
  duration_days:
    props.initialValue?.duration_days != null ? String(props.initialValue.duration_days) : '',
  is_recommended: props.initialValue?.is_recommended ?? false,
  is_active: props.initialValue?.is_active ?? true,
})

// includes se edita como lista de inputs; al menos una fila para poder escribir.
const includes = ref(
  Array.isArray(props.initialValue?.includes) && props.initialValue.includes.length > 0
    ? [...props.initialValue.includes]
    : [''],
)

const errors = reactive({
  name: '',
  price: '',
  currency: '',
  duration_days: '',
})

const buttonLabel = computed(() => (props.saving ? 'Guardando…' : props.submitLabel))

function addInclude() {
  includes.value.push('')
}

function removeInclude(index) {
  includes.value.splice(index, 1)
  if (includes.value.length === 0) includes.value.push('')
}

function onCurrencyInput(value) {
  form.currency = String(value ?? '').toUpperCase()
}

function validate() {
  errors.name = ''
  errors.price = ''
  errors.currency = ''
  errors.duration_days = ''

  const name = form.name.trim()
  if (name.length < 1 || name.length > 120) {
    errors.name = 'El nombre debe tener entre 1 y 120 caracteres.'
  }

  const price = Number(form.price)
  if (!Number.isFinite(price) || price <= 0) {
    errors.price = 'El precio debe ser mayor que cero.'
  }

  if (!/^[A-Z]{3}$/.test(form.currency)) {
    errors.currency = 'La moneda debe ser un código de 3 letras mayúsculas (p. ej. MXN).'
  }

  const duration = Number(form.duration_days)
  if (!Number.isInteger(duration) || duration <= 0) {
    errors.duration_days = 'La duración debe ser un número entero mayor que cero.'
  }

  return !errors.name && !errors.price && !errors.currency && !errors.duration_days
}

function handleSubmit() {
  if (!validate()) return

  const cleanIncludes = includes.value.map((item) => item.trim()).filter((item) => item.length > 0)

  emit('submit', {
    name: form.name.trim(),
    description: form.description.trim() || null,
    price: Number(form.price),
    currency: form.currency,
    duration_days: Number(form.duration_days),
    includes: cleanIncludes,
    is_recommended: form.is_recommended,
    is_active: form.is_active,
  })
}
</script>

<template>
  <form class="space-y-6" novalidate @submit.prevent="handleSubmit">
    <BaseCard>
      <h2 class="text-lg font-bold">Datos del paquete</h2>
      <p class="mt-1 text-sm text-neutral-600">Información principal que verá el cliente.</p>
      <div class="mt-5 space-y-5">
        <BaseInput
          id="name"
          v-model="form.name"
          label="Nombre"
          maxlength="120"
          :error="errors.name"
        />
        <BaseTextarea id="description" v-model="form.description" label="Descripción" />
        <div class="grid gap-5 sm:grid-cols-3">
          <BaseInput
            id="price"
            v-model="form.price"
            label="Precio"
            type="number"
            min="0.01"
            step="0.01"
            inputmode="decimal"
            :error="errors.price"
          />
          <BaseInput
            id="currency"
            :model-value="form.currency"
            label="Moneda"
            maxlength="3"
            :error="errors.currency"
            @update:model-value="onCurrencyInput"
          />
          <BaseInput
            id="duration_days"
            v-model="form.duration_days"
            label="Duración (días)"
            type="number"
            min="1"
            step="1"
            inputmode="numeric"
            :error="errors.duration_days"
          />
        </div>
      </div>
    </BaseCard>

    <BaseCard>
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-bold">¿Qué incluye?</h2>
          <p class="mt-1 text-sm text-neutral-600">Lista de beneficios que se mostrarán.</p>
        </div>
        <BaseButton type="button" variant="secondary" @click="addInclude">Agregar</BaseButton>
      </div>
      <ul class="mt-5 space-y-3">
        <li v-for="(item, index) in includes" :key="index" class="flex items-center gap-2">
          <input
            :id="`include-${index}`"
            v-model="includes[index]"
            type="text"
            class="focus-ring min-h-11 w-full rounded-md border border-neutral-300 bg-white px-3.5 py-2.5 text-sm"
            :aria-label="`Beneficio ${index + 1}`"
            placeholder="Ej. Rutina personalizada"
          />
          <BaseButton type="button" variant="ghost" @click="removeInclude(index)">
            Quitar
          </BaseButton>
        </li>
      </ul>
    </BaseCard>

    <BaseCard>
      <h2 class="text-lg font-bold">Visibilidad</h2>
      <div class="mt-5 space-y-4">
        <label class="flex items-center gap-3 text-sm font-medium text-neutral-800">
          <input
            v-model="form.is_recommended"
            type="checkbox"
            class="focus-ring size-4 rounded border-neutral-300 text-brand-green"
          />
          Marcar como recomendado
        </label>
        <label class="flex items-center gap-3 text-sm font-medium text-neutral-800">
          <input
            v-model="form.is_active"
            type="checkbox"
            class="focus-ring size-4 rounded border-neutral-300 text-brand-green"
          />
          Activo (visible en el catálogo)
        </label>
      </div>
    </BaseCard>

    <div class="flex justify-end">
      <BaseButton type="submit" :disabled="saving">{{ buttonLabel }}</BaseButton>
    </div>
  </form>
</template>
