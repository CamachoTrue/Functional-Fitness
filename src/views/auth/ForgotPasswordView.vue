<script setup>
import { ref } from 'vue'
import { RouterLink } from 'vue-router'

import BaseButton from '../../components/common/BaseButton.vue'
import BaseInput from '../../components/common/BaseInput.vue'
import { requestPasswordReset } from '../../services/authService'
import { isValidEmail } from '../../utils/validators'

const email = ref('')
const errorMessage = ref('')
const sent = ref(false)
const loading = ref(false)

const handleSubmit = async () => {
  errorMessage.value = ''

  if (!isValidEmail(email.value)) {
    errorMessage.value = 'Escribe un correo electrónico válido.'
    return
  }

  loading.value = true
  try {
    await requestPasswordReset(email.value.trim())
    // Siempre se muestra el mismo mensaje, exista o no la cuenta: no revelar qué
    // correos están registrados (evita enumeración de usuarios).
    sent.value = true
  } catch {
    errorMessage.value = 'No pudimos enviar el correo. Inténtalo de nuevo en unos minutos.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="py-16 sm:py-24">
    <div class="page-container max-w-md">
      <h1 class="text-3xl font-black tracking-tight">Recuperar contraseña</h1>

      <template v-if="!sent">
        <p class="mt-3 text-sm leading-6 text-muted">
          Escribe tu correo y te enviaremos un enlace para restablecer tu contraseña.
        </p>

        <form class="mt-8 space-y-5" @submit.prevent="handleSubmit">
          <BaseInput
            id="forgot-email"
            v-model="email"
            label="Correo electrónico"
            type="email"
            autocomplete="email"
            required
          />

          <p v-if="errorMessage" class="text-sm text-danger" role="alert">
            {{ errorMessage }}
          </p>

          <BaseButton class="w-full" type="submit" :disabled="loading">
            {{ loading ? 'Enviando…' : 'Enviar enlace' }}
          </BaseButton>
        </form>
      </template>

      <div
        v-else
        class="mt-8 rounded-xl border border-border-subtle bg-surface-muted p-6"
        role="status"
      >
        <p class="text-sm font-semibold text-body">Te enviamos un enlace para restablecer tu contraseña.</p>
        <p class="mt-2 text-sm leading-6 text-muted">
          Revisa la bandeja de entrada de <span class="font-medium text-body">{{ email.trim() }}</span>
          (y la carpeta de spam). El enlace caduca en una hora.
        </p>
      </div>

      <p class="mt-6 text-center text-sm text-muted">
        <RouterLink class="focus-ring rounded-sm font-semibold text-body underline" to="/entrar">
          Volver a iniciar sesión
        </RouterLink>
      </p>
    </div>
  </section>
</template>
