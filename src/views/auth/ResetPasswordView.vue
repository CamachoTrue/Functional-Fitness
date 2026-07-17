<script setup>
import { onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import BaseButton from '../../components/common/BaseButton.vue'
import BaseInput from '../../components/common/BaseInput.vue'
import { useAuthStore } from '../../stores/authStore'
import { updatePassword } from '../../services/authService'
import { validateNewPassword } from '../../utils/validators'

const auth = useAuthStore()
const router = useRouter()

const password = ref('')
const confirmation = ref('')
const errorMessage = ref('')
const loading = ref(false)
const done = ref(false)
// El enlace del correo establece una sesión de recuperación (evento
// PASSWORD_RECOVERY). Si no hay sesión al llegar aquí, el enlace es inválido o
// caducó y no tiene sentido mostrar el formulario.
const hasRecoverySession = ref(true)

onMounted(async () => {
  // Da un instante a que supabase-js procese el token del hash de la URL y a que
  // el store capte la sesión de recuperación antes de decidir qué mostrar.
  await new Promise((resolve) => setTimeout(resolve, 400))
  hasRecoverySession.value = auth.isAuthenticated
})

const handleSubmit = async () => {
  errorMessage.value = ''

  const validationError = validateNewPassword(password.value, confirmation.value)
  if (validationError) {
    errorMessage.value = validationError
    return
  }

  loading.value = true
  try {
    await updatePassword(password.value)
    // Tras cambiar la contraseña se cierra la sesión de recuperación para que el
    // usuario inicie sesión con la nueva contraseña (confirma que funciona).
    await auth.logout()
    done.value = true
  } catch {
    errorMessage.value =
      'No pudimos actualizar tu contraseña. Solicita un enlace nuevo e inténtalo otra vez.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="py-16 sm:py-24">
    <div class="page-container max-w-md">
      <h1 class="text-3xl font-black tracking-tight">Nueva contraseña</h1>

      <!-- Éxito -->
      <div
        v-if="done"
        class="mt-8 rounded-xl border border-border-subtle bg-surface-muted p-6"
        role="status"
      >
        <p class="text-sm font-semibold text-body">Contraseña actualizada correctamente.</p>
        <p class="mt-2 text-sm leading-6 text-muted">Ya puedes iniciar sesión con tu nueva contraseña.</p>
        <BaseButton class="mt-5 w-full" type="button" @click="router.push('/entrar')">
          Ir a iniciar sesión
        </BaseButton>
      </div>

      <!-- Enlace inválido / caducado -->
      <div
        v-else-if="!hasRecoverySession"
        class="mt-8 rounded-xl border border-border-subtle bg-surface-muted p-6"
      >
        <p class="text-sm font-semibold text-body">Enlace inválido o caducado</p>
        <p class="mt-2 text-sm leading-6 text-muted">
          Este enlace ya no es válido. Solicita uno nuevo para restablecer tu contraseña.
        </p>
        <RouterLink
          class="focus-ring mt-5 inline-flex rounded-sm font-semibold text-body underline"
          to="/recuperar-contrasena"
        >
          Solicitar un enlace nuevo
        </RouterLink>
      </div>

      <!-- Formulario -->
      <template v-else>
        <p class="mt-3 text-sm leading-6 text-muted">Escribe tu nueva contraseña.</p>

        <form class="mt-8 space-y-5" @submit.prevent="handleSubmit">
          <BaseInput
            id="reset-password"
            v-model="password"
            label="Nueva contraseña"
            type="password"
            autocomplete="new-password"
            required
          />
          <BaseInput
            id="reset-password-confirm"
            v-model="confirmation"
            label="Confirmar nueva contraseña"
            type="password"
            autocomplete="new-password"
            required
          />

          <p v-if="errorMessage" class="text-sm text-danger" role="alert">
            {{ errorMessage }}
          </p>

          <BaseButton class="w-full" type="submit" :disabled="loading">
            {{ loading ? 'Guardando…' : 'Guardar contraseña' }}
          </BaseButton>
        </form>
      </template>
    </div>
  </section>
</template>
