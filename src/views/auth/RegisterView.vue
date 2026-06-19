<script setup>
import { ref } from 'vue'
import { RouterLink } from 'vue-router'

import BaseButton from '../../components/common/BaseButton.vue'
import BaseInput from '../../components/common/BaseInput.vue'

const fullName = ref('')
const email = ref('')
const password = ref('')
</script>

<template>
  <section class="py-16 sm:py-24">
    <div class="page-container max-w-md">
      <h1 class="text-3xl font-black tracking-tight">Crea tu cuenta</h1>
      <p class="mt-3 text-sm leading-6 text-neutral-600">El primer paso para recibir un plan hecho para ti.</p>

      <form class="mt-8 space-y-5" @submit.prevent>
        <BaseInput id="register-name" v-model="fullName" label="Nombre completo" autocomplete="name" />
        <BaseInput id="register-email" v-model="email" label="Correo electrónico" type="email" autocomplete="email" />
        <BaseInput
          id="register-password"
          v-model="password"
          label="Contraseña"
          type="password"
          autocomplete="new-password"
        />
        <BaseButton class="w-full" type="submit">Crear cuenta</BaseButton>
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
