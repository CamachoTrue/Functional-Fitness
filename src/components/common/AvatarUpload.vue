<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'

import BaseButton from './BaseButton.vue'
import UserAvatar from './UserAvatar.vue'
import { useAuthStore } from '../../stores/authStore'
import {
  buildAvatarPath,
  removeAvatar,
  uploadAvatar,
  validateAvatarFile,
} from '../../services/storageService'
import { updateMyProfile } from '../../services/profileService'

/**
 * Subir/cambiar la foto de perfil. Reúsa el patrón de FileUpload (input file
 * oculto disparado por un botón) pero orquesta el flujo completo contra los
 * services (nunca toca supabase directo): validar → subir al bucket avatars →
 * persistir avatar_path en profiles → refrescar el store para que el avatar del
 * menú se actualice sin recargar. Si la persistencia falla tras subir, hace
 * rollback borrando el objeto recién subido.
 */
const props = defineProps({
  // Dueño del avatar. Por defecto el usuario autenticado.
  userId: {
    type: String,
    default: '',
  },
  // Nombre para las iniciales/alt del avatar de respaldo.
  name: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['updated'])

const auth = useAuthStore()

const inputRef = ref(null)
const saving = ref(false)
const errorMessage = ref('')
// Previsualización local (object URL) mientras se confirma la subida.
const previewUrl = ref(null)

const effectiveUserId = computed(() => props.userId || auth.user?.id || '')
const displayName = computed(() => props.name || auth.displayName)
// La preview local tiene prioridad; si no, la URL firmada del store.
const shownSrc = computed(() => previewUrl.value ?? auth.avatarUrl)

function revokePreview() {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = null
  }
}

function openPicker() {
  errorMessage.value = ''
  inputRef.value?.click()
}

async function handleChange(event) {
  const file = event.target.files?.[0] ?? null
  // Permite volver a elegir el mismo archivo tras un error.
  event.target.value = ''
  if (!file) return

  errorMessage.value = ''

  const validationError = validateAvatarFile(file)
  if (validationError) {
    errorMessage.value = validationError
    return
  }

  const userId = effectiveUserId.value
  if (!userId) {
    errorMessage.value = 'No pudimos identificar tu cuenta. Inicia sesión de nuevo.'
    return
  }

  // Preview inmediata mientras sube.
  revokePreview()
  previewUrl.value = URL.createObjectURL(file)

  saving.value = true
  const path = buildAvatarPath(userId, file.name)
  try {
    await uploadAvatar(path, file, { upsert: true })
    try {
      await updateMyProfile({ userId, avatarPath: path })
    } catch (persistError) {
      // Rollback: el objeto se subió pero no se pudo persistir el path.
      try {
        await removeAvatar(path)
      } catch {
        // Si el rollback falla, no hay más que hacer desde el cliente.
      }
      throw persistError
    }
    await auth.refreshProfile()
    emit('updated')
  } catch {
    errorMessage.value = 'No pudimos actualizar tu foto. Inténtalo de nuevo.'
  } finally {
    revokePreview()
    saving.value = false
  }
}

onBeforeUnmount(revokePreview)
</script>

<template>
  <div class="flex flex-wrap items-center gap-4 sm:gap-5">
    <UserAvatar :src="shownSrc" :name="displayName" size="lg" />

    <div class="min-w-0">
      <input
        ref="inputRef"
        type="file"
        accept="image/*"
        class="hidden"
        :disabled="saving"
        @change="handleChange"
      />
      <BaseButton
        type="button"
        variant="secondary"
        :disabled="saving"
        @click="openPicker"
      >
        <span
          v-if="saving"
          class="mr-2 inline-block size-4 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent"
          aria-hidden="true"
        />
        {{ saving ? 'Subiendo…' : 'Cambiar foto' }}
      </BaseButton>
      <p class="mt-2 text-xs text-muted">JPG, PNG o WebP. Máximo 5 MB.</p>
      <p v-if="errorMessage" class="mt-2 text-sm text-danger" role="alert">
        {{ errorMessage }}
      </p>
    </div>
  </div>
</template>
