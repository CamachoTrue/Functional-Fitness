<script setup>
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import BaseButton from '../../components/common/BaseButton.vue'
import BaseInput from '../../components/common/BaseInput.vue'
import { useAuthStore } from '../../stores/authStore'

const auth = useAuthStore()
const router = useRouter()

const fullName = ref('')
const email = ref('')
const password = ref('')
const errorMessage = ref('')
const infoMessage = ref('')

const handleSubmit = async () => {
  errorMessage.value = ''
  infoMessage.value = ''

  if (password.value.length < 8) {
    errorMessage.value = 'La contraseña debe tener al menos 8 caracteres.'
    return
  }

  try {
    await auth.register({
      fullName: fullName.value,
      email: email.value,
      password: password.value,
    })

    if (auth.isAuthenticated) {
      router.push(auth.homeRoute)
    } else {
      // Cuando la confirmación por correo está activa no hay sesión inmediata.
      infoMessage.value = 'Cuenta creada. Revisa tu correo para confirmar y luego inicia sesión.'
    }
  } catch (error) {
    errorMessage.value =
      error?.message === 'User already registered'
        ? 'Ya existe una cuenta con este correo.'
        : 'No pudimos crear tu cuenta. Inténtalo de nuevo.'
  }
}
</script>

<template>
  <section class="py-16 sm:py-24">
    <div class="page-container max-w-md">
      <h1 class="text-3xl font-black tracking-tight">Crea tu cuenta</h1>
      <p class="mt-3 text-sm leading-6 text-neutral-600">El primer paso para recibir un plan hecho para ti.</p>

      <form class="mt-8 space-y-5" @submit.prevent="handleSubmit">
        <BaseInput
          id="register-name"
          v-model="fullName"
          label="Nombre completo"
          autocomplete="name"
          maxlength="120"
          required
        />
        <BaseInput
          id="register-email"
          v-model="email"
          label="Correo electrónico"
          type="email"
          autocomplete="email"
          required
        />
        <BaseInput
          id="register-password"
          v-model="password"
          label="Contraseña"
          type="password"
          autocomplete="new-password"
          required
        />

        <p v-if="errorMessage" class="text-sm text-red-600" role="alert">
          {{ errorMessage }}
        </p>
        <p v-if="infoMessage" class="text-sm text-brand-green" role="status">
          {{ infoMessage }}
        </p>

        <BaseButton class="w-full" type="submit" :disabled="auth.loading">
          {{ auth.loading ? 'Creando cuenta…' : 'Crear cuenta' }}
        </BaseButton>
      </form>

      <p class="mt-6 text-center text-sm text-neutral-600">
        ¿Ya tienes cuenta?
        <RouterLink class="focus-ring rounded-sm font-semibold text-black underline" to="/login">
          Inicia sesión
        </RouterLink>
      </p>
    </div>
  </section>
</template>
