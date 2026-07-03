<script setup>
import { computed } from 'vue'

/**
 * Input de archivo accesible con el mismo lenguaje visual que BaseInput (label
 * ligado por for=id, borde neutral/rojo según error, patrón de mensaje de
 * error). No conoce Supabase: solo emite el File seleccionado por
 * update:modelValue y muestra su nombre y tamaño. La validación de tipo/tamaño
 * vive en storageService y se pasa como prop `error` desde el formulario.
 */
defineOptions({ inheritAttrs: false })

const props = defineProps({
  id: {
    type: String,
    required: true,
  },
  label: {
    type: String,
    required: true,
  },
  accept: {
    type: String,
    default: 'video/mp4,video/webm,video/quicktime',
  },
  modelValue: {
    type: Object,
    default: null,
  },
  error: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['update:modelValue'])

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}

const selectedLabel = computed(() => {
  if (!props.modelValue) return ''
  return `${props.modelValue.name} · ${formatSize(props.modelValue.size)}`
})

function handleChange(event) {
  const file = event.target.files?.[0] ?? null
  emit('update:modelValue', file)
}
</script>

<template>
  <div>
    <label class="mb-2 block text-sm font-semibold text-body" :for="id">{{ label }}</label>
    <input
      v-bind="$attrs"
      :id="id"
      type="file"
      :accept="accept"
      class="focus-ring w-full rounded-md border bg-surface-raised px-3.5 py-2.5 text-sm text-body file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-accent-foreground hover:file:bg-accent-hover"
      :class="error ? 'border-red-500' : 'border-border-strong'"
      :aria-invalid="Boolean(error)"
      :aria-describedby="error ? `${id}-error` : undefined"
      @change="handleChange"
    />
    <p v-if="selectedLabel" class="mt-1.5 text-sm text-muted">{{ selectedLabel }}</p>
    <p v-if="error" :id="`${id}-error`" class="mt-1.5 text-sm text-danger">{{ error }}</p>
  </div>
</template>
