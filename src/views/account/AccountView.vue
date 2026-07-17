<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'

import AvatarUpload from '../../components/common/AvatarUpload.vue'
import BaseButton from '../../components/common/BaseButton.vue'
import BaseInput from '../../components/common/BaseInput.vue'
import SaveButton from '../../components/common/SaveButton.vue'
import { useAuthStore } from '../../stores/authStore'
import { useCurrency } from '../../composables/useCurrency'
import { changePassword, resendVerificationEmail } from '../../services/authService'
import { updateMyProfile } from '../../services/profileService'
import { fetchMyPurchases } from '../../services/paymentService'
import { validateNewPassword } from '../../utils/validators'

const auth = useAuthStore()
const { formatCurrency } = useCurrency()

// ----- Perfil (nombre, teléfono, foto) -----
const fullName = ref('')
const phone = ref('')
const profileError = ref('')
const profileSuccess = ref(false)
const profileSaving = ref(false)

// Prellenar el formulario en cuanto el perfil esté disponible y re-sincronizar
// tras guardar (refreshProfile actualiza auth.profile con los valores nuevos).
watch(
  () => auth.profile,
  (profile) => {
    fullName.value = profile?.full_name ?? ''
    phone.value = profile?.phone ?? ''
  },
  { immediate: true },
)

const handleSaveProfile = async () => {
  profileError.value = ''
  profileSuccess.value = false

  const name = fullName.value.trim()
  if (!name) {
    profileError.value = 'Escribe tu nombre.'
    return
  }
  if (name.length > 120) {
    profileError.value = 'El nombre no puede superar los 120 caracteres.'
    return
  }
  if (phone.value.trim().length > 30) {
    profileError.value = 'El teléfono no puede superar los 30 caracteres.'
    return
  }

  profileSaving.value = true
  try {
    await updateMyProfile({
      userId: auth.user?.id,
      fullName: name,
      phone: phone.value.trim() || null,
    })
    await auth.refreshProfile()
    profileSuccess.value = true
  } catch {
    profileError.value = 'No pudimos guardar tus datos. Inténtalo de nuevo.'
  } finally {
    profileSaving.value = false
  }
}

// ----- Verificación de correo -----
const resending = ref(false)
const resendState = ref('') // '' | 'sent' | 'error'

const handleResend = async () => {
  resendState.value = ''
  resending.value = true
  try {
    await resendVerificationEmail(auth.user?.email)
    resendState.value = 'sent'
  } catch {
    resendState.value = 'error'
  } finally {
    resending.value = false
  }
}

// ----- Plan actual -----
const planLoading = ref(true)
const activePurchase = ref(null)

function isActiveApproved(purchase) {
  if (purchase?.payment_status !== 'approved') return false
  const now = Date.now()
  if (purchase.start_date && new Date(purchase.start_date).getTime() > now) return false
  if (purchase.end_date && new Date(purchase.end_date).getTime() <= now) return false
  return true
}

onMounted(async () => {
  if (auth.isAdmin) {
    planLoading.value = false
    return
  }
  try {
    const purchases = await fetchMyPurchases()
    activePurchase.value = purchases.find((p) => isActiveApproved(p)) ?? null
  } catch {
    activePurchase.value = null
  } finally {
    planLoading.value = false
  }
})

const planEndLabel = computed(() => {
  const end = activePurchase.value?.end_date
  if (!end) return null
  return new Date(end).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
})

// ----- Cambiar contraseña -----
const currentPassword = ref('')
const newPassword = ref('')
const confirmation = ref('')
const errorMessage = ref('')
const success = ref(false)
const saving = ref(false)

const handleChangePassword = async () => {
  errorMessage.value = ''
  success.value = false

  if (!currentPassword.value) {
    errorMessage.value = 'Escribe tu contraseña actual.'
    return
  }
  const validationError = validateNewPassword(newPassword.value, confirmation.value)
  if (validationError) {
    errorMessage.value = validationError
    return
  }

  saving.value = true
  try {
    await changePassword({
      email: auth.user?.email,
      currentPassword: currentPassword.value,
      newPassword: newPassword.value,
    })
    success.value = true
    currentPassword.value = ''
    newPassword.value = ''
    confirmation.value = ''
  } catch (error) {
    errorMessage.value =
      error?.code === 'invalid_credentials' || error?.message === 'invalid_current_password'
        ? 'Tu contraseña actual no es correcta.'
        : 'No pudimos actualizar tu contraseña. Inténtalo de nuevo.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="py-12 sm:py-16">
    <div class="page-container max-w-2xl">
      <RouterLink
        class="focus-ring inline-flex items-center rounded-sm text-sm font-semibold text-brand-blue transition hover:underline"
        :to="auth.homeRoute"
      >
        ← Volver a mi panel
      </RouterLink>

      <h1 class="mt-4 text-3xl font-black tracking-tight">Configuración de cuenta</h1>
      <p class="mt-2 text-sm leading-6 text-muted">
        {{ auth.displayName }} · <span class="text-body">{{ auth.user?.email }}</span>
      </p>

      <!-- Tu perfil (foto, nombre, teléfono) -->
      <div class="mt-8 rounded-2xl border border-border-subtle bg-surface-raised p-6 sm:p-8">
        <h2 class="text-lg font-bold tracking-tight">Tu perfil</h2>
        <p class="mt-1 text-sm text-muted">
          Actualiza tu foto y tus datos de contacto.
        </p>

        <div class="mt-6">
          <AvatarUpload :user-id="auth.user?.id" :name="auth.displayName" />
        </div>

        <form class="mt-6 space-y-5" @submit.prevent="handleSaveProfile">
          <BaseInput
            id="account-full-name"
            v-model="fullName"
            label="Nombre completo"
            type="text"
            autocomplete="name"
            maxlength="120"
            required
          />
          <BaseInput
            id="account-phone"
            v-model="phone"
            label="Teléfono"
            type="tel"
            autocomplete="tel"
            maxlength="30"
          />

          <p v-if="profileError" class="text-sm text-danger" role="alert">
            {{ profileError }}
          </p>
          <p v-if="profileSuccess" class="text-sm text-brand-blue" role="status">
            Datos actualizados correctamente.
          </p>

          <div class="flex justify-end">
            <SaveButton
              type="submit"
              :saving="profileSaving"
              :has-error="Boolean(profileError)"
              idle-label="Guardar cambios"
              saved-label="Guardado"
            />
          </div>
        </form>
      </div>

      <!-- Verificación de correo (solo si NO está verificado) -->
      <div
        v-if="!auth.emailVerified"
        class="mt-8 rounded-2xl border border-border-subtle bg-surface-muted p-6"
      >
        <h2 class="text-lg font-bold tracking-tight">Verifica tu correo</h2>
        <p class="mt-1 text-sm leading-6 text-muted">
          Te enviamos un correo de verificación. Confírmalo para asegurar tu cuenta.
        </p>
        <div class="mt-4 flex flex-wrap items-center gap-3">
          <BaseButton type="button" variant="secondary" :disabled="resending" @click="handleResend">
            {{ resending ? 'Enviando…' : 'Reenviar correo de verificación' }}
          </BaseButton>
          <span v-if="resendState === 'sent'" class="text-sm text-brand-blue" role="status">
            Correo enviado. Revisa tu bandeja.
          </span>
          <span v-else-if="resendState === 'error'" class="text-sm text-danger" role="alert">
            No pudimos reenviarlo. Inténtalo en unos minutos.
          </span>
        </div>
      </div>

      <!-- Plan actual (solo clientes) -->
      <div
        v-if="!auth.isAdmin"
        class="mt-8 rounded-2xl border border-border-subtle bg-surface-raised p-6 sm:p-8"
      >
        <h2 class="text-lg font-bold tracking-tight">Tu plan</h2>

        <p v-if="planLoading" class="mt-2 text-sm text-muted">Cargando tu plan…</p>

        <template v-else-if="activePurchase">
          <div class="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span class="text-xl font-black tracking-tight">{{ activePurchase.package_name }}</span>
            <span class="text-sm text-muted">
              {{ formatCurrency(activePurchase.amount, activePurchase.currency) }}
            </span>
          </div>
          <p v-if="planEndLabel" class="mt-1 text-sm text-muted">Vigente hasta el {{ planEndLabel }}.</p>
          <RouterLink
            class="focus-ring mt-5 inline-flex items-center rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:bg-accent-hover"
            to="/planes"
          >
            Cambiar o mejorar plan
          </RouterLink>
        </template>

        <template v-else>
          <p class="mt-2 text-sm leading-6 text-muted">Aún no tienes un plan activo.</p>
          <RouterLink
            class="focus-ring mt-5 inline-flex items-center rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:bg-accent-hover"
            to="/planes"
          >
            Ver paquetes
          </RouterLink>
        </template>
      </div>

      <!-- Cambiar contraseña -->
      <div class="mt-8 rounded-2xl border border-border-subtle bg-surface-raised p-6 sm:p-8">
        <h2 class="text-lg font-bold tracking-tight">Cambiar contraseña</h2>
        <p class="mt-1 text-sm text-muted">Usa al menos 8 caracteres.</p>

        <form class="mt-6 space-y-5" @submit.prevent="handleChangePassword">
          <BaseInput
            id="account-current-password"
            v-model="currentPassword"
            label="Contraseña actual"
            type="password"
            autocomplete="current-password"
            required
          />
          <BaseInput
            id="account-new-password"
            v-model="newPassword"
            label="Nueva contraseña"
            type="password"
            autocomplete="new-password"
            required
          />
          <BaseInput
            id="account-confirm-password"
            v-model="confirmation"
            label="Confirmar nueva contraseña"
            type="password"
            autocomplete="new-password"
            required
          />

          <p v-if="errorMessage" class="text-sm text-danger" role="alert">
            {{ errorMessage }}
          </p>
          <p v-if="success" class="text-sm text-brand-blue" role="status">
            Contraseña actualizada correctamente.
          </p>

          <div class="flex justify-end">
            <SaveButton
              type="submit"
              :saving="saving"
              :has-error="Boolean(errorMessage)"
              idle-label="Actualizar contraseña"
              saved-label="Actualizada"
            />
          </div>
        </form>
      </div>
    </div>
  </section>
</template>
