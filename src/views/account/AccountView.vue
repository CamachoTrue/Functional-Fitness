<script setup>
import { ref } from 'vue'
import { RouterLink } from 'vue-router'

import BaseButton from '../../components/common/BaseButton.vue'
import BaseInput from '../../components/common/BaseInput.vue'
import SaveButton from '../../components/common/SaveButton.vue'
import { useAuthStore } from '../../stores/authStore'
import { changePassword } from '../../services/authService'
import { validateNewPassword } from '../../utils/validators'

const auth = useAuthStore()

const currentPassword = ref('')
const newPassword = ref('')
const confirmation = ref('')
const errorMessage = ref('')
const success = ref(false)
const saving = ref(false)

const handleChangePassword = async () => {
  errorMessage.value = ''
  success.value = false

  if (!currentPassword.value) {
    errorMessage.value = 'Escribe tu contraseña actual.'
    return
  }
  const validationError = validateNewPassword(newPassword.value, confirmation.value)
  if (validationError) {
    errorMessage.value = validationError
    return
  }

  saving.value = true
  try {
    await changePassword({
      email: auth.user?.email,
      currentPassword: currentPassword.value,
      newPassword: newPassword.value,
    })
    success.value = true
    currentPassword.value = ''
    newPassword.value = ''
    confirmation.value = ''
  } catch (error) {
    errorMessage.value =
      error?.code === 'invalid_credentials' || error?.message === 'invalid_current_password'
        ? 'Tu contraseña actual no es correcta.'
        : 'No pudimos actualizar tu contraseña. Inténtalo de nuevo.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="py-12 sm:py-16">
    <div class="page-container max-w-2xl">
      <RouterLink
        class="focus-ring inline-flex items-center rounded-sm text-sm font-semibold text-brand-green transition hover:underline"
        :to="auth.homeRoute"
      >
        ← Volver a mi panel
      </RouterLink>

      <h1 class="mt-4 text-3xl font-black tracking-tight">Configuración de cuenta</h1>
      <p class="mt-2 text-sm leading-6 text-muted">
        {{ auth.displayName }} · <span class="text-body">{{ auth.user?.email }}</span>
      </p>

      <div class="mt-10 rounded-2xl border border-border-subtle bg-surface-raised p-6 sm:p-8">
        <h2 class="text-lg font-bold tracking-tight">Cambiar contraseña</h2>
        <p class="mt-1 text-sm text-muted">Usa al menos 8 caracteres.</p>

        <form class="mt-6 space-y-5" @submit.prevent="handleChangePassword">
          <BaseInput
            id="account-current-password"
            v-model="currentPassword"
            label="Contraseña actual"
            type="password"
            autocomplete="current-password"
            required
          />
          <BaseInput
            id="account-new-password"
            v-model="newPassword"
            label="Nueva contraseña"
            type="password"
            autocomplete="new-password"
            required
          />
          <BaseInput
            id="account-confirm-password"
            v-model="confirmation"
            label="Confirmar nueva contraseña"
            type="password"
            autocomplete="new-password"
            required
          />

          <p v-if="errorMessage" class="text-sm text-danger" role="alert">
            {{ errorMessage }}
          </p>
          <p v-if="success" class="text-sm text-brand-green" role="status">
            Contraseña actualizada correctamente.
          </p>

          <div class="flex justify-end">
            <SaveButton
              type="submit"
              :saving="saving"
              :has-error="Boolean(errorMessage)"
              idle-label="Actualizar contraseña"
              saved-label="Actualizada"
            />
          </div>
        </form>
      </div>
    </div>
  </section>
</template>
