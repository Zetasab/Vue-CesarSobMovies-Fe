<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { userRegistrationService } from '../../services/userRegistrationService'

const route = useRoute()
const router = useRouter()

const state = reactive({
  email: '',
  code: ''
})

const isSubmitting = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

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

  return 'No se pudo verificar el codigo. Revisa los datos e intentalo de nuevo.'
}

onMounted(() => {
  const queryEmail = route.query.email
  if (typeof queryEmail === 'string') {
    state.email = queryEmail
  }
})

async function onSubmit(): Promise<void> {
  if (isSubmitting.value) {
    return
  }

  errorMessage.value = ''
  successMessage.value = ''

  if (!state.email.trim() || !state.code.trim()) {
    errorMessage.value = 'Debes completar email y codigo de verificacion.'
    return
  }

  isSubmitting.value = true

  try {
    const response = await userRegistrationService.verifyEmail(state.email.trim(), state.code.trim())
    successMessage.value = response.message ?? 'Cuenta creada exitosamente. Ya puedes iniciar sesion.'
    await router.push({ name: 'login' })
  } catch (error) {
    errorMessage.value = getErrorMessage(error)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <main class="verify-page">
    <section class="verify-shell">
      <header class="verify-header">
        <p class="verify-kicker">ZetaGamesFe</p>
        <h1 class="verify-title">Verificar email</h1>
        <p class="verify-subtitle">Introduce el codigo enviado a tu correo para completar el registro.</p>
      </header>

      <v-form class="verify-form" @submit.prevent="onSubmit">
        <v-text-field
          v-model="state.email"
          label="Email"
          variant="outlined"
          type="email"
          autocomplete="email"
          prepend-inner-icon="mdi-email-outline"
          :disabled="isSubmitting"
          color="primary"
          bg-color="#0a2142"
        />

        <v-text-field
          v-model="state.code"
          label="Codigo de verificacion"
          variant="outlined"
          prepend-inner-icon="mdi-shield-key-outline"
          :disabled="isSubmitting"
          color="primary"
          bg-color="#0a2142"
        />

        <p v-if="errorMessage" class="verify-error">{{ errorMessage }}</p>
        <p v-if="successMessage" class="verify-success">{{ successMessage }}</p>

        <div class="verify-actions">
          <v-btn type="submit" color="primary" :loading="isSubmitting">Validar usuario</v-btn>
          <v-btn variant="text" :disabled="isSubmitting" @click="router.push({ name: 'register' })">
            Volver a registro
          </v-btn>
        </div>
      </v-form>
    </section>
  </main>
</template>

<style scoped src="./VerifyEmail.css"></style>
