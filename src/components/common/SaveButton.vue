<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

/**
 * Botón de guardar con tres estados animados:
 *   idle    → etiqueta normal (ej. "Guardar"), estilo primario (accent).
 *   saving  → etiqueta "Guardando" + spinner; deshabilitado (driven by `saving`).
 *   saved   → etiqueta "Guardado" + check verde; se muestra un instante tras un
 *             guardado exitoso y vuelve solo a idle.
 *
 * El estado `saved` se dispara solo: al pasar `saving` de true→false, si NO hubo
 * error (`hasError`), muestra el check por `savedDuration` ms. Así el padre solo
 * pasa `saving` (y opcionalmente `hasError`); no necesita temporizadores propios.
 */
const props = defineProps({
  type: {
    type: String,
    default: 'submit',
  },
  saving: {
    type: Boolean,
    default: false,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  // Si es true cuando termina el guardado, se omite el estado "Guardado".
  hasError: {
    type: Boolean,
    default: false,
  },
  idleLabel: {
    type: String,
    default: 'Guardar',
  },
  savingLabel: {
    type: String,
    default: 'Guardando',
  },
  savedLabel: {
    type: String,
    default: 'Guardado',
  },
  savedDuration: {
    type: Number,
    default: 1600,
  },
})

const savedActive = ref(false)
let timer = null

watch(
  () => props.saving,
  async (now, prev) => {
    if (now) {
      // Empieza un nuevo guardado: limpia cualquier "Guardado" pendiente.
      savedActive.value = false
      if (timer) clearTimeout(timer)
      return
    }
    if (prev && !now) {
      // Terminó de guardar: espera un tick para conocer el resultado (hasError).
      await nextTick()
      if (props.hasError) return
      savedActive.value = true
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        savedActive.value = false
      }, props.savedDuration)
    }
  },
)

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer)
})

const state = computed(() => {
  if (props.saving) return 'saving'
  if (savedActive.value) return 'saved'
  return 'idle'
})

const label = computed(
  () =>
    ({
      idle: props.idleLabel,
      saving: props.savingLabel,
      saved: props.savedLabel,
    })[state.value],
)

const stateClasses = computed(
  () =>
    ({
      idle: 'bg-accent text-accent-foreground hover:bg-accent-hover active:scale-[0.98]',
      saving: 'bg-surface-muted text-muted cursor-wait',
      saved: 'bg-surface-muted text-body',
    })[state.value],
)

const isDisabled = computed(
  () => props.disabled || props.saving || savedActive.value,
)
</script>

<template>
  <button
    class="focus-ring inline-flex min-h-11 min-w-44 items-center justify-center gap-2.5 rounded-full px-6 py-2.5 text-sm font-semibold transition-all duration-200 disabled:cursor-not-allowed"
    :class="stateClasses"
    :type="type"
    :disabled="isDisabled"
    :aria-busy="saving"
  >
    <span>{{ label }}</span>

    <!-- Spinner mientras guarda. -->
    <span
      v-if="state === 'saving'"
      class="size-4 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent"
      aria-hidden="true"
    />

    <!-- Check verde tras guardar. -->
    <span
      v-else-if="state === 'saved'"
      class="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-blue text-white"
      aria-hidden="true"
    >
      <svg
        class="size-3.5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="3.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M20 6 9 17l-5-5" />
      </svg>
    </span>
  </button>
</template>
