<script setup>
import { ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import BaseButton from '../../components/common/BaseButton.vue'
import BaseInput from '../../components/common/BaseInput.vue'
import { useAuthStore } from '../../stores/authStore'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const email = ref('')
const password = ref('')
const errorMessage = ref('')

const handleSubmit = async () => {
  errorMessage.value = ''
  try {
    await auth.login({ email: email.value, password: password.value })
    const raw = route.query.redirect
    const redirect =
      typeof raw === 'string' && raw.startsWith('/') && !raw.startsWith('//') ? raw : null
    router.push(redirect || auth.homeRoute)
  } catch (error) {
    errorMessage.value = 'Correo o contraseña incorrectos. Inténtalo de nuevo.'
  }
}
</script>

<template>
  <section class="py-16 sm:py-24">
    <div class="page-container max-w-md">
      <h1 class="text-3xl font-black tracking-tight">Inicia sesión</h1>
      <p class="mt-3 text-sm leading-6 text-neutral-600">Accede a tu plan y a tus entrenamientos.</p>

      <form class="mt-8 space-y-5" @submit.prevent="handleSubmit">
        <BaseInput
          id="login-email"
          v-model="email"
          label="Correo electrónico"
          type="email"
          autocomplete="email"
          required
        />
        <BaseInput
          id="login-password"
          v-model="password"
          label="Contraseña"
          type="password"
          autocomplete="current-password"
          required
        />

        <p v-if="errorMessage" class="text-sm text-red-600" role="alert">
          {{ errorMessage }}
        </p>

        <BaseButton class="w-full" type="submit" :disabled="auth.loading">
          {{ auth.loading ? 'Entrando…' : 'Entrar' }}
        </BaseButton>
      </form>

      <p class="mt-6 text-center text-sm text-neutral-600">
        ¿Aún no tienes cuenta?
        <RouterLink class="focus-ring rounded-sm font-semibold text-black underline" to="/register">
          Regístrate
        </RouterLink>
      </p>
    </div>
  </section>
</template>
