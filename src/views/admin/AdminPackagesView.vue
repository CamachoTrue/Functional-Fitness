<script setup>
import { onMounted } from 'vue'
import { RouterLink } from 'vue-router'

import BaseButton from '../../components/common/BaseButton.vue'
import LoadingSpinner from '../../components/common/LoadingSpinner.vue'
import PackageTable from '../../components/packages/PackageTable.vue'
import { usePackagesAdmin } from '../../composables/usePackagesAdmin'

const { packages, loading, error, saving, load, toggleActive } = usePackagesAdmin()

async function handleToggle({ id, isActive }) {
  try {
    await toggleActive(id, isActive)
  } catch {
    // El composable ya expone el error en `error`; no rompemos la vista.
  }
}

onMounted(load)
</script>

<template>
  <div class="mx-auto max-w-6xl">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p class="text-sm font-bold text-brand-blue">CATÁLOGO</p>
        <h1 class="mt-2 text-3xl font-black tracking-tight">Paquetes</h1>
        <p class="mt-2 text-sm text-muted">
          Crea, edita y activa o desactiva los paquetes del catálogo.
        </p>
      </div>
      <RouterLink :to="{ name: 'admin-package-create' }">
        <BaseButton type="button">Nuevo paquete</BaseButton>
      </RouterLink>
    </div>

    <div class="mt-8">
      <LoadingSpinner v-if="loading" label="Cargando paquetes" />

      <div
        v-else-if="error && packages.length === 0"
        class="rounded-xl border border-border-subtle bg-surface-raised p-6 shadow-sm"
      >
        <p class="text-sm text-danger" role="alert">{{ error }}</p>
        <BaseButton class="mt-4" type="button" variant="secondary" @click="load">
          Recargar
        </BaseButton>
      </div>

      <template v-else>
        <p v-if="error" class="mb-4 text-sm text-danger" role="alert">{{ error }}</p>
        <PackageTable :packages="packages" :saving="saving" @toggle-active="handleToggle" />
      </template>
    </div>
  </div>
</template>
