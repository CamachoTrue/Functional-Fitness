<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'

import BaseButton from '../../components/common/BaseButton.vue'
import EmptyState from '../../components/common/EmptyState.vue'
import LoadingSpinner from '../../components/common/LoadingSpinner.vue'
import PackageForm from '../../components/packages/PackageForm.vue'
import { usePackagesAdmin } from '../../composables/usePackagesAdmin'
import { fetchPackageByIdAdmin } from '../../services/packagesService'

/**
 * Vista de creación y edición de paquetes. Detecta el modo por la presencia de
 * `id` (prop de la ruta). En edición carga el paquete con el service admin (sin
 * filtrar is_active). Al guardar delega en usePackagesAdmin y navega a la lista.
 */
const props = defineProps({
  id: {
    type: String,
    default: '',
  },
})

const router = useRouter()
const { saving, error, create, update } = usePackagesAdmin()

const isEdit = computed(() => Boolean(props.id))

const initialValue = ref(null)
const loading = ref(false)
const loadError = ref('')
const notFound = ref(false)

async function loadPackage() {
  if (!isEdit.value) return
  loading.value = true
  loadError.value = ''
  notFound.value = false
  try {
    const pkg = await fetchPackageByIdAdmin(props.id)
    if (!pkg) {
      notFound.value = true
    } else {
      initialValue.value = pkg
    }
  } catch {
    loadError.value = 'No pudimos cargar el paquete. Intenta de nuevo en unos minutos.'
  } finally {
    loading.value = false
  }
}

async function handleSubmit(payload) {
  try {
    if (isEdit.value) {
      await update(props.id, payload)
    } else {
      await create(payload)
    }
    router.push({ name: 'admin-packages' })
  } catch {
    // usePackagesAdmin ya expone el mensaje en `error`; la vista lo muestra.
  }
}

onMounted(loadPackage)
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <RouterLink
      class="focus-ring inline-flex items-center rounded-sm text-sm font-semibold text-brand-green transition hover:underline"
      :to="{ name: 'admin-packages' }"
    >
      ← Volver a paquetes
    </RouterLink>

    <h1 class="mt-4 text-3xl font-black tracking-tight">
      {{ isEdit ? 'Editar paquete' : 'Nuevo paquete' }}
    </h1>

    <div class="mt-8">
      <LoadingSpinner v-if="loading" label="Cargando paquete" />

      <div
        v-else-if="loadError"
        class="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm"
      >
        <p class="text-sm text-red-700" role="alert">{{ loadError }}</p>
        <BaseButton class="mt-4" type="button" variant="secondary" @click="loadPackage">
          Recargar
        </BaseButton>
      </div>

      <EmptyState
        v-else-if="notFound"
        title="Paquete no encontrado"
        description="Este paquete no existe o no tienes permiso para verlo."
      />

      <template v-else>
        <p v-if="error" class="mb-4 text-sm text-red-700" role="alert">{{ error }}</p>
        <PackageForm
          :initial-value="initialValue"
          :saving="saving"
          :submit-label="isEdit ? 'Guardar cambios' : 'Crear paquete'"
          @submit="handleSubmit"
        />
      </template>
    </div>
  </div>
</template>
