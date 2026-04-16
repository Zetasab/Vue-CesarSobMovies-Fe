<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { userRegistrationService } from '../../services/userRegistrationService'

const router = useRouter()

const state = reactive({
  email: '',
  username: '',
  password: '',
  confirmPassword: ''
})

const acceptPolicies = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref('')

function validateEmail(value: string): boolean {
  const normalizedValue = value.trim()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedValue)
}

const passwordChecks = computed(() => {
  const value = state.password

  return {
    length: value.length >= 8,
    uppercase: /[A-Z]/.test(value),
    lowercase: /[a-z]/.test(value),
    number: /\d/.test(value),
    special: /[^A-Za-z0-9]/.test(value)
  }
})

const isPasswordValid = computed(() => Object.values(passwordChecks.value).every(Boolean))
const doPasswordsMatch = computed(
  () => state.confirmPassword.length > 0 && state.password === state.confirmPassword
)
const isFormValid = computed(
  () =>
    validateEmail(state.email) &&
    state.username.trim().length >= 3 &&
    isPasswordValid.value &&
    doPasswordsMatch.value &&
    acceptPolicies.value
)

function getErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error && 'payload' in error) {
    const payload = (error as { payload?: unknown }).payload
    if (typeof payload === 'object' && payload && 'message' in payload) {
      const payloadMessage = (payload as { message?: unknown }).message
      if (typeof payloadMessage === 'string' && payloadMessage.trim()) {
        return payloadMessage
      }
    }
  }

  return 'No se pudo completar el registro. Intentalo de nuevo.'
}

async function onSubmit(): Promise<void> {
  if (isSubmitting.value) {
    return
  }

  errorMessage.value = ''

  if (!isFormValid.value) {
    if (!state.confirmPassword.length) {
      errorMessage.value = 'Debes repetir la contraseña.'
      return
    }

    if (state.confirmPassword.length > 0 && !doPasswordsMatch.value) {
      errorMessage.value = 'Las contraseñas no coinciden.'
      return
    }

    errorMessage.value = 'Revisa los campos y acepta las condiciones para continuar.'
    return
  }

  isSubmitting.value = true

  try {
    await userRegistrationService.register(state.email.trim(), state.username.trim(), state.password)

    await router.push({
      name: 'verify-email',
      query: {
        email: state.email.trim()
      }
    })
  } catch (error) {
    errorMessage.value = getErrorMessage(error)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <main class="register-page">
    <section class="register-shell">
      <header class="register-header">
        <p class="register-kicker">ZetaGamesFe</p>
        <h1 class="register-title">Crear usuario</h1>
        <p class="register-subtitle">Completa tus datos para registrarte.</p>
      </header>

      <v-form class="register-form" @submit.prevent="onSubmit">
        <v-text-field
          v-model="state.email"
          label="Email"
          variant="outlined"
          type="email"
          autocomplete="email"
          prepend-inner-icon="mdi-email-outline"
          :disabled="isSubmitting"
          :error="Boolean(state.email) && !validateEmail(state.email)"
          color="primary"
          bg-color="#0a2142"
        />

        <v-text-field
          v-model="state.username"
          label="Username"
          variant="outlined"
          autocomplete="username"
          prepend-inner-icon="mdi-account-outline"
          :disabled="isSubmitting"
          :error="Boolean(state.username) && state.username.trim().length < 3"
          color="primary"
          bg-color="#0a2142"
        />

        <v-text-field
          v-model="state.password"
          label="Contraseña"
          variant="outlined"
          type="password"
          autocomplete="new-password"
          prepend-inner-icon="mdi-lock-outline"
          :disabled="isSubmitting"
          :error="Boolean(state.password) && !isPasswordValid"
          color="primary"
          bg-color="#0a2142"
        />

        <v-text-field
          v-model="state.confirmPassword"
          label="Repetir contraseña"
          variant="outlined"
          type="password"
          autocomplete="new-password"
          prepend-inner-icon="mdi-lock-check-outline"
          :disabled="isSubmitting"
          :error="Boolean(state.confirmPassword) && !doPasswordsMatch"
          color="primary"
          bg-color="#0a2142"
        />

        <div class="register-password-rules" aria-label="Validaciones de contraseña">
          <p :class="{ 'is-valid': passwordChecks.length }">Minimo 8 caracteres</p>
          <p :class="{ 'is-valid': passwordChecks.uppercase }">Al menos una mayuscula</p>
          <p :class="{ 'is-valid': passwordChecks.lowercase }">Al menos una minuscula</p>
          <p :class="{ 'is-valid': passwordChecks.number }">Al menos un numero</p>
          <p :class="{ 'is-valid': passwordChecks.special }">Al menos un caracter especial</p>
        </div>

        <v-checkbox v-model="acceptPolicies" :disabled="isSubmitting" color="primary" density="comfortable" hide-details>
          <template #label>
            <span>
              He leido y acepto las
              <a href="/politica-privacidad-condiciones-uso" target="_blank" rel="noopener noreferrer" class="register-policy-link">
                condiciones de uso y politica de privacidad
              </a>
            </span>
          </template>
        </v-checkbox>

        <p v-if="errorMessage" class="register-error">{{ errorMessage }}</p>

        <div class="register-actions">
          <v-btn type="submit" color="primary" :loading="isSubmitting">Crear usuario</v-btn>
          <v-btn variant="text" :disabled="isSubmitting" @click="router.push({ name: 'login' })">Volver a login</v-btn>
        </div>
      </v-form>
    </section>
  </main>
</template>

<style scoped src="./Register.css"></style>
