<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <footer class="border-t border-border-subtle bg-surface py-16">
    <div class="page-container flex flex-col items-center text-center">
      <RouterLink
        class="focus-ring rounded-sm font-display text-base font-semibold tracking-[0.28em] uppercase"
        to="/"
      >
        Sera Trainer
      </RouterLink>
      <p class="mt-4 max-w-md text-sm leading-6 text-muted">
        Entrenamiento personalizado con método, estructura y acompañamiento.
      </p>

      <nav class="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3" aria-label="Enlaces del pie">
        <RouterLink class="focus-ring rounded-sm text-xs font-medium tracking-[0.12em] text-muted uppercase transition hover:text-body" to="/planes">
          Paquetes
        </RouterLink>
        <RouterLink class="focus-ring rounded-sm text-xs font-medium tracking-[0.12em] text-muted uppercase transition hover:text-body" to="/registro">
          Comenzar
        </RouterLink>
        <RouterLink class="focus-ring rounded-sm text-xs font-medium tracking-[0.12em] text-muted uppercase transition hover:text-body" to="/entrar">
          Entrar
        </RouterLink>
      </nav>

      <p class="mt-10 text-xs tracking-[0.1em] text-faint uppercase">
        © {{ new Date().getFullYear() }} Sera Trainer
      </p>
    </div>
  </footer>
</template>
