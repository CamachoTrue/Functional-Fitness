<script setup>
import { ref } from 'vue'
import { RouterLink } from 'vue-router'

import BaseButton from '../../components/common/BaseButton.vue'
import BaseInput from '../../components/common/BaseInput.vue'

const email = ref('')
const password = ref('')
</script>

<template>
  <section class="py-16 sm:py-24">
    <div class="page-container max-w-md">
      <h1 class="text-3xl font-black tracking-tight">Inicia sesión</h1>
      <p class="mt-3 text-sm leading-6 text-neutral-600">Accede a tu plan y a tus entrenamientos.</p>

      <form class="mt-8 space-y-5" @submit.prevent>
        <BaseInput id="login-email" v-model="email" label="Correo electrónico" type="email" autocomplete="email" />
        <BaseInput
          id="login-password"
          v-model="password"
          label="Contraseña"
          type="password"
          autocomplete="current-password"
        />
        <BaseButton class="w-full" type="submit">Entrar</BaseButton>
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
