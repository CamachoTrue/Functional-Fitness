<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import BaseButton from '../../components/common/BaseButton.vue'
import BaseCard from '../../components/common/BaseCard.vue'
import LoadingSpinner from '../../components/common/LoadingSpinner.vue'
import { useCurrency } from '../../composables/useCurrency'
import { fetchPurchaseById } from '../../services/paymentService'

const route = useRoute()
const { formatCurrency } = useCurrency()

const loading = ref(true)
const error = ref(false)
const purchase = ref(null)

// external_reference = purchase.id, tal como lo envía la Edge Function a
// Mercado Pago. Es la única pista fiable de la URL de retorno; el estado real
// del pago se lee siempre de la base, nunca de la query.
const purchaseId = computed(() => {
  const value = route.query.external_reference
  return typeof value === 'string' ? value : null
})

const formattedAmount = computed(() =>
  purchase.value ? formatCurrency(purchase.value.amount, purchase.value.currency) : '',
)

const statusLabels = {
  approved: 'Pago confirmado',
  pending: 'Pago en revisión',
  rejected: 'Pago rechazado',
  cancelled: 'Pago cancelado',
  refunded: 'Pago reembolsado',
}

const statusLabel = computed(() => {
  const status = purchase.value?.payment_status
  return statusLabels[status] ?? 'Estado del pago'
})

// Etiqueta corta para la fila "Estado" del detalle: nunca mostramos el valor
// crudo del enum. `in_process` (Mercado Pago) se trata como pendiente.
const paymentStatusLabels = {
  approved: 'Aprobada',
  pending: 'Pendiente',
  in_process: 'Pendiente',
  rejected: 'Rechazada',
  cancelled: 'Cancelada',
  refunded: 'Reembolsada',
  expired: 'Vencida',
}

const paymentStatusLabel = computed(() => {
  const status = purchase.value?.payment_status
  return paymentStatusLabels[status] ?? '—'
})

const isPending = computed(
  () => purchase.value?.payment_status === 'pending' || purchase.value?.payment_status === 'in_process',
)

async function load() {
  loading.value = true
  error.value = false
  purchase.value = null

  if (!purchaseId.value) {
    // Sin referencia no podemos consultar la compra: estado neutro, sin error
    // técnico, con enlaces para continuar.
    loading.value = false
    return
  }

  try {
    purchase.value = await fetchPurchaseById(purchaseId.value)
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <section class="py-16 sm:py-24">
    <div class="page-container max-w-2xl">
      <BaseCard>
        <LoadingSpinner v-if="loading" label="Confirmando tu pago" />

        <template v-else>
          <template v-if="purchase">
            <h1 class="text-2xl font-black tracking-tight">{{ statusLabel }}</h1>

            <dl class="mt-6 space-y-3 text-sm">
              <div class="flex justify-between gap-4">
                <dt class="text-faint">Paquete</dt>
                <dd class="font-semibold text-right">{{ purchase.package_name }}</dd>
              </div>
              <div class="flex justify-between gap-4">
                <dt class="text-faint">Importe</dt>
                <dd class="font-semibold text-right">{{ formattedAmount }}</dd>
              </div>
              <div class="flex justify-between gap-4">
                <dt class="text-faint">Estado</dt>
                <dd class="font-semibold text-right">{{ paymentStatusLabel }}</dd>
              </div>
            </dl>

            <p v-if="isPending" class="mt-6 text-sm leading-6 text-muted">
              Estamos confirmando tu pago. Esto puede tardar unos minutos; puedes recargar esta
              página para ver el estado actualizado.
            </p>
          </template>

          <template v-else-if="error">
            <h1 class="text-2xl font-black tracking-tight">No pudimos consultar tu pago</h1>
            <p class="mt-4 text-sm leading-6 text-muted">
              Hubo un problema al consultar el estado de tu compra. Intenta recargar esta página en
              unos minutos.
            </p>
          </template>

          <template v-else>
            <h1 class="text-2xl font-black tracking-tight">Gracias por tu compra</h1>
            <p class="mt-4 text-sm leading-6 text-muted">
              Si acabas de completar un pago, estamos confirmándolo. Inicia sesión para ver el estado
              de tu compra en tu panel.
            </p>
          </template>

          <div class="mt-8 flex flex-wrap items-center gap-3">
            <BaseButton
              v-if="isPending || error"
              type="button"
              variant="secondary"
              @click="load"
            >
              Recargar
            </BaseButton>

            <RouterLink
              class="focus-ring inline-flex min-h-11 items-center justify-center rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition hover:bg-accent-hover"
              to="/cliente/panel"
            >
              Ir a mi panel
            </RouterLink>

            <RouterLink
              class="focus-ring inline-flex min-h-11 items-center justify-center rounded-md px-5 py-2.5 text-sm font-semibold text-body transition hover:bg-surface-muted"
              to="/planes"
            >
              Ver paquetes
            </RouterLink>
          </div>

          <p v-if="!purchase && !error" class="mt-4 text-xs text-faint">
            ¿No ves tu compra?
            <RouterLink class="font-semibold underline underline-offset-4" :to="{ name: 'login' }">
              Inicia sesión
            </RouterLink>
            para continuar.
          </p>
        </template>
      </BaseCard>
    </div>
  </section>
</template>
