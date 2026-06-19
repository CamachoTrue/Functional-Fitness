<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <main class="grid min-h-screen place-items-center bg-black px-5 text-center text-white">
    <div>
      <p class="text-sm font-bold text-brand-green">ERROR 404</p>
      <h1 class="mt-3 text-4xl font-black">Esta página no existe.</h1>
      <RouterLink
        class="focus-ring mt-8 inline-flex min-h-11 items-center rounded-md bg-white px-5 text-sm font-semibold text-black"
        to="/"
      >
        Volver al inicio
      </RouterLink>
    </div>
  </main>
</template>
