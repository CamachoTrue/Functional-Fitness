<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'

import { validateVideoFile } from '../../services/storageService'
import BaseButton from '../common/BaseButton.vue'
import BaseCard from '../common/BaseCard.vue'
import BaseInput from '../common/BaseInput.vue'
import BaseSelect from '../common/BaseSelect.vue'
import BaseTextarea from '../common/BaseTextarea.vue'
import FileUpload from '../common/FileUpload.vue'

/**
 * Formulario de creación/edición de un ejercicio. Incluye la carga del video
 * con preview: para un archivo recién elegido usa URL.createObjectURL (preview
 * local); para el video ya guardado en edición pide una signed URL al padre vía
 * la prop `getPreviewUrl`. La validación de tamaño/mime (storageService) se
 * muestra bajo el campo. Emite `submit` con { fields, file }.
 *
 * No accede a Supabase directamente: la signed URL la resuelve el composable a
 * través de la prop inyectada.
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
    default: 'Guardar ejercicio',
  },
  // Función que devuelve una Promise<string> con la signed URL de un path.
  getPreviewUrl: {
    type: Function,
    default: null,
  },
})

const emit = defineEmits(['submit'])

const CATEGORY_OPTIONS = [
  { value: 'Pierna', label: 'Pierna' },
  { value: 'Empuje', label: 'Empuje' },
  { value: 'Jalón', label: 'Jalón' },
  { value: 'Core', label: 'Core' },
  { value: 'Movilidad', label: 'Movilidad' },
  { value: 'Cardio', label: 'Cardio' },
  { value: 'Metcon', label: 'Metcon' },
  { value: 'Full body', label: 'Full body' },
]

const LEVEL_OPTIONS = [
  { value: 'basic', label: 'Básico' },
  { value: 'intermediate', label: 'Intermedio' },
  { value: 'advanced', label: 'Avanzado' },
]

const form = reactive({
  name: props.initialValue?.name ?? '',
  category: props.initialValue?.category ?? '',
  muscle_group: props.initialValue?.muscle_group ?? '',
  equipment: props.initialValue?.equipment ?? '',
  level: props.initialValue?.level ?? '',
  description: props.initialValue?.description ?? '',
  common_mistakes: props.initialValue?.common_mistakes ?? '',
})

const errors = reactive({
  name: '',
  category: '',
  level: '',
})

const file = ref(null)
const fileError = ref('')

// Preview local del archivo elegido (createObjectURL) — se revoca al cambiar.
const localPreviewUrl = ref('')
// Preview del video ya guardado (signed URL) — solo en edición sin archivo nuevo.
const savedPreviewUrl = ref('')
const savedPreviewError = ref('')

const hasSavedVideo = computed(() => Boolean(props.initialValue?.video_path))
// En edición ofrecemos "Reemplazar video"; el input arranca oculto hasta pedirlo.
const showUpload = ref(!hasSavedVideo.value)

const buttonLabel = computed(() => (props.saving ? 'Guardando…' : props.submitLabel))

function revokeLocalPreview() {
  if (localPreviewUrl.value) {
    URL.revokeObjectURL(localPreviewUrl.value)
    localPreviewUrl.value = ''
  }
}

function onFileSelected(selected) {
  revokeLocalPreview()
  file.value = selected
  fileError.value = ''

  if (!selected) return

  const validationError = validateVideoFile(selected)
  if (validationError) {
    fileError.value = validationError
    return
  }
  localPreviewUrl.value = URL.createObjectURL(selected)
}

function enableReplace() {
  showUpload.value = true
}

// Carga la signed URL del video guardado cuando corresponde previsualizarlo.
watch(
  () => props.initialValue?.video_path,
  async (path) => {
    savedPreviewUrl.value = ''
    savedPreviewError.value = ''
    if (!path || typeof props.getPreviewUrl !== 'function') return
    try {
      savedPreviewUrl.value = await props.getPreviewUrl(path)
    } catch {
      savedPreviewError.value = 'No pudimos cargar la vista previa del video guardado.'
    }
  },
  { immediate: true },
)

onBeforeUnmount(revokeLocalPreview)

function validate() {
  errors.name = ''
  errors.category = ''
  errors.level = ''

  if (form.name.trim().length < 1) {
    errors.name = 'El nombre es obligatorio.'
  }
  if (!form.category) {
    errors.category = 'Selecciona una categoría.'
  }
  if (!form.level) {
    errors.level = 'Selecciona un nivel.'
  }

  return !errors.name && !errors.category && !errors.level
}

function handleSubmit() {
  if (!validate()) return

  if (file.value) {
    const validationError = validateVideoFile(file.value)
    if (validationError) {
      fileError.value = validationError
      return
    }
  }

  emit('submit', {
    fields: {
      name: form.name.trim(),
      category: form.category,
      muscle_group: form.muscle_group.trim() || null,
      equipment: form.equipment.trim() || null,
      level: form.level,
      description: form.description.trim() || null,
      common_mistakes: form.common_mistakes.trim() || null,
    },
    file: file.value,
  })
}
</script>

<template>
  <form class="space-y-6" novalidate @submit.prevent="handleSubmit">
    <BaseCard>
      <h2 class="text-lg font-bold">Datos del ejercicio</h2>
      <div class="mt-5 space-y-5">
        <BaseInput id="name" v-model="form.name" label="Nombre" maxlength="120" :error="errors.name" />
        <div class="grid gap-5 sm:grid-cols-2">
          <BaseSelect
            id="category"
            v-model="form.category"
            label="Categoría"
            :options="CATEGORY_OPTIONS"
            :error="errors.category"
          />
          <BaseSelect
            id="level"
            v-model="form.level"
            label="Nivel"
            :options="LEVEL_OPTIONS"
            :error="errors.level"
          />
          <BaseInput id="muscle_group" v-model="form.muscle_group" label="Grupo muscular" />
          <BaseInput id="equipment" v-model="form.equipment" label="Equipo" />
        </div>
        <BaseTextarea id="description" v-model="form.description" label="Descripción" />
        <BaseTextarea
          id="common_mistakes"
          v-model="form.common_mistakes"
          label="Errores comunes"
        />
      </div>
    </BaseCard>

    <BaseCard>
      <h2 class="text-lg font-bold">Video demostrativo</h2>
      <p class="mt-1 text-sm text-neutral-600">
        Formatos permitidos: MP4, WebM o MOV. Tamaño máximo 50 MB.
      </p>

      <!-- Video guardado (edición) -->
      <div v-if="hasSavedVideo && !file" class="mt-5">
        <p class="mb-2 text-sm font-semibold text-neutral-800">Video actual</p>
        <video
          v-if="savedPreviewUrl"
          :src="savedPreviewUrl"
          controls
          preload="metadata"
          class="w-full max-w-md rounded-md border border-neutral-200"
        />
        <p v-else-if="savedPreviewError" class="text-sm text-red-700" role="alert">
          {{ savedPreviewError }}
        </p>
        <p v-else class="text-sm text-neutral-500">Cargando vista previa…</p>

        <BaseButton
          v-if="!showUpload"
          class="mt-4"
          type="button"
          variant="secondary"
          @click="enableReplace"
        >
          Reemplazar video
        </BaseButton>
      </div>

      <div v-if="showUpload || file" class="mt-5">
        <FileUpload
          id="video"
          :model-value="file"
          label="Archivo de video"
          :error="fileError"
          @update:model-value="onFileSelected"
        />
        <div v-if="localPreviewUrl" class="mt-4">
          <p class="mb-2 text-sm font-semibold text-neutral-800">Vista previa</p>
          <video
            :src="localPreviewUrl"
            controls
            preload="metadata"
            class="w-full max-w-md rounded-md border border-neutral-200"
          />
        </div>
      </div>
    </BaseCard>

    <div class="flex justify-end">
      <BaseButton type="submit" :disabled="saving">{{ buttonLabel }}</BaseButton>
    </div>
  </form>
</template>
