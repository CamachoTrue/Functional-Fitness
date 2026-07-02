<script setup>
import { RouterView } from 'vue-router'

import WhatsAppButton from '../components/common/WhatsAppButton.vue'
import PublicFooter from '../components/layout/PublicFooter.vue'
import PublicHeader from '../components/layout/PublicHeader.vue'
</script>

<template>
  <div class="flex min-h-screen flex-col bg-white">
    <a
      href="#main"
      class="focus-ring sr-only rounded-md bg-black px-4 py-2 text-sm font-semibold text-white focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50"
    >
      Saltar al contenido
    </a>
    <PublicHeader />
    <main id="main" class="flex-1">
      <RouterView />
    </main>
    <PublicFooter />
    <WhatsAppButton />
  </div>
</template>
