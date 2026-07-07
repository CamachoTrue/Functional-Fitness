<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import { useAuthStore } from '../../stores/authStore'
import UserAvatar from '../common/UserAvatar.vue'

/**
 * Menú de usuario (dropdown). Agrupa el acceso a la configuración de cuenta y el
 * cierre de sesión (con confirmación), para que "Cerrar sesión" deje de ser un
 * botón principal junto a otras acciones. Se usa en la cabecera pública y en el
 * sidebar del panel; `triggerClass` permite adaptar el disparador al fondo (claro
 * u oscuro) y `align` abre el panel hacia arriba o hacia abajo.
 */
const props = defineProps({
  triggerClass: {
    type: String,
    default: '',
  },
  align: {
    type: String,
    default: 'down',
    validator: (v) => ['down', 'up'].includes(v),
  },
  // El disparador puede vivir sobre una superficie oscura (sidebar). En ese caso
  // el avatar de respaldo necesita el tratamiento inverso para contrastar. El
  // panel del dropdown usa surface-raised (tema normal), así que su avatar NO.
  onInverse: {
    type: Boolean,
    default: false,
  },
})

const auth = useAuthStore()
const router = useRouter()

const open = ref(false)
const confirming = ref(false)
const loggingOut = ref(false)
const root = ref(null)

const menuItemClass =
  'focus-ring flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-body transition hover:bg-surface-muted'

function toggle() {
  open.value = !open.value
  confirming.value = false
}

function close() {
  open.value = false
  confirming.value = false
}

async function confirmLogout() {
  loggingOut.value = true
  try {
    await auth.logout()
  } finally {
    loggingOut.value = false
    close()
    router.push('/')
  }
}

function onDocClick(event) {
  if (root.value && !root.value.contains(event.target)) close()
}
function onKeydown(event) {
  if (event.key === 'Escape') close()
}

onMounted(() => {
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div ref="root" class="relative">
    <button
      type="button"
      class="focus-ring flex items-center gap-2 rounded-md"
      :class="triggerClass"
      :aria-expanded="open"
      aria-haspopup="menu"
      @click.stop="toggle"
    >
      <UserAvatar :src="auth.avatarUrl" :name="auth.displayName" size="sm" :on-inverse="onInverse" />
      <span class="min-w-0 truncate">{{ auth.displayName }}</span>
      <svg
        class="size-4 shrink-0 transition-transform"
        :class="open ? 'rotate-180' : ''"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>

    <div
      v-if="open"
      class="absolute right-0 z-20 w-60 rounded-xl border border-border-subtle bg-surface-raised p-1.5 shadow-lg"
      :class="align === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'"
      role="menu"
      @click.stop
    >
      <div class="flex items-center gap-3 px-3 py-2">
        <UserAvatar :src="auth.avatarUrl" :name="auth.displayName" size="sm" />
        <div class="min-w-0">
          <p class="truncate text-sm font-semibold text-body">{{ auth.displayName }}</p>
          <p class="truncate text-xs text-muted">{{ auth.user?.email }}</p>
        </div>
      </div>
      <div class="my-1 border-t border-border-subtle" />

      <RouterLink :to="{ name: 'account' }" :class="menuItemClass" role="menuitem" @click="close">
        Configuración de cuenta
      </RouterLink>

      <div class="my-1 border-t border-border-subtle" />

      <template v-if="!confirming">
        <button type="button" :class="menuItemClass" role="menuitem" @click="confirming = true">
          Cerrar sesión
        </button>
      </template>
      <div v-else class="px-3 py-2">
        <p class="text-xs text-muted">¿Seguro que quieres cerrar sesión?</p>
        <div class="mt-2 flex gap-2">
          <button
            type="button"
            class="focus-ring flex-1 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground transition hover:bg-accent-hover disabled:opacity-60"
            :disabled="loggingOut"
            @click="confirmLogout"
          >
            {{ loggingOut ? 'Saliendo…' : 'Sí, cerrar' }}
          </button>
          <button
            type="button"
            class="focus-ring flex-1 rounded-md border border-border-strong px-3 py-1.5 text-xs font-semibold text-body transition hover:bg-surface-muted"
            @click="confirming = false"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
