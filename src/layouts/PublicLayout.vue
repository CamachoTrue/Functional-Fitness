<script setup>
import { RouterView } from 'vue-router'

import PublicFooter from '../components/layout/PublicFooter.vue'
import PublicHeader from '../components/layout/PublicHeader.vue'
</script>

<template>
  <div class="flex min-h-screen flex-col bg-white">
    <PublicHeader />
    <main class="flex-1">
      <RouterView />
    </main>
    <PublicFooter />
  </div>
</template>
