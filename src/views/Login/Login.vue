<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import LoadingResult from '../../components/LoadingResult.vue'
import { authService } from '../../services/authService'
import zetaMovAppLogo from '../../assets/ZetaMovApp.png'

type FeedbackState = 'idle' | 'loading' | 'correct' | 'wrong'

const router = useRouter()
const route = useRoute()

const state = reactive({
  email: '',
  password: ''
})

const feedbackState = ref<FeedbackState>('idle')
const credentialsError = ref(false)
const loginErrorMessage = ref('')
const policyError = ref(false)
const isBusy = computed(() => feedbackState.value !== 'idle')

const showPassword = ref(false)
const rememberUser = ref(false)
const acceptPolicies = ref(false)
const proyect = 'mvs'
const ACCEPT_POLICIES_STORAGE_KEY = 'login-accept-policies'
const TEST_USER_EMAIL = 'user@cesarsobrino.es'
const useTestUser = ref(false)

function loadAcceptedPoliciesFromStorage(): void {
  if (typeof window === 'undefined') {
    return
  }

  acceptPolicies.value = window.localStorage.getItem(ACCEPT_POLICIES_STORAGE_KEY) === 'true'
}

function saveAcceptedPoliciesToStorage(value: boolean): void {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(ACCEPT_POLICIES_STORAGE_KEY, String(value))
}

onMounted(() => {
  const rememberedEmail = authService.getRememberedUsername()
  const rememberedPassword = authService.getRememberedPassword()
  loadAcceptedPoliciesFromStorage()

  if (route.query.test === 'true') {
    useTestUser.value = true
  }

  if (rememberedEmail && rememberedPassword) {
    state.email = rememberedEmail
    state.password = rememberedPassword
    rememberUser.value = true
  }
})

watch(rememberUser, (shouldRememberUser) => {
  if (!shouldRememberUser) {
    authService.clearRememberedUsername()
    authService.clearRememberedPassword()
  }
})

watch(acceptPolicies, () => {
  policyError.value = false
  saveAcceptedPoliciesToStorage(acceptPolicies.value)
})

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

async function onSubmit(): Promise<void> {
  if (feedbackState.value !== 'idle') {
    return
  }

  if (!acceptPolicies.value) {
    policyError.value = true
    return
  }

  credentialsError.value = false
  policyError.value = false
  loginErrorMessage.value = ''
  feedbackState.value = 'loading'

  const loginEmail = useTestUser.value ? TEST_USER_EMAIL : state.email
  const isValidLogin = await authService.login(loginEmail, state.password, proyect)

  feedbackState.value = isValidLogin ? 'correct' : 'wrong'

  if (isValidLogin) {
    if (rememberUser.value) {
      authService.saveRememberedUsername(loginEmail)
      authService.saveRememberedPassword(state.password)
    } else {
      authService.clearRememberedUsername()
      authService.clearRememberedPassword()
    }

    await delay(600)
    router.push('/')
    return
  }

  credentialsError.value = true
  loginErrorMessage.value = authService.getLastLoginErrorMessage() ?? 'Credenciales incorrectas'
  await delay(600)
  feedbackState.value = 'idle'
}
</script>

<template>
  <main class="login-page">
    <section class="login-shell">
      <div class="login-layout">
        <div class="login-panel">
          <div class="login-header">
            <p class="login-kicker">ZetaGamesFe</p>
            <div class="login-title-row">
              <img :src="zetaMovAppLogo" alt="ZetaMovApp" class="login-logo" />
              <h1 class="login-title">Iniciar sesión</h1>
            </div>
          </div>

          <v-form @submit.prevent="onSubmit" class="login-form">
            <v-text-field
              v-if="!useTestUser"
              v-model="state.email"
              label="Email"
              variant="outlined"
              type="email"
              autocomplete="email"
              prepend-inner-icon="mdi-email-outline"
              :error="credentialsError"
              :disabled="isBusy"
              color="primary"
              bg-color="#0a2142"
              class="login-input"
            />

            <v-text-field
              v-if="!useTestUser"
              v-model="state.password"
              label="Contraseña"
              :type="showPassword ? 'text' : 'password'"
              variant="outlined"
              density="comfortable"
              autocomplete="current-password"
              prepend-inner-icon="mdi-lock"
              :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
              @click:append-inner="showPassword = !showPassword"
              :error="credentialsError"
              :disabled="isBusy"
              color="primary"
              bg-color="#0a2142"
              class="login-input"
            />

            <div v-if="useTestUser" class="login-test-user-banner" aria-live="polite">
              <p class="login-test-user-label">Usuario prueba activado</p>
              <p class="login-test-user-email">{{ TEST_USER_EMAIL }}</p>
            </div>

            <v-btn
              variant="flat"
              color="primary"
              :disabled="isBusy"
              class="login-test-user-toggle"
              prepend-icon="mdi-flask-outline"
              @click="useTestUser = !useTestUser"
            >
              {{ useTestUser ? 'Desactivar usuario prueba' : 'Loguearse con usuario prueba' }}
            </v-btn>

            <v-checkbox
              v-model="rememberUser"
              label="Recordar email"
              :disabled="isBusy"
              color="primary"
              density="comfortable"
              hide-details
              class="login-remember"
            />

            <div class="login-policies">
              <v-checkbox
                v-model="acceptPolicies"
                :disabled="isBusy"
                color="primary"
                density="comfortable"
                hide-details
                class="login-accept"
              >
                <template #label>
                  <span>
                    He leido y acepto las
                    <a
                      href="/politica-privacidad-condiciones-uso"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="login-policy-link"
                    >
                      condiciones de uso y politica de privacidad
                    </a>
                  </span>
                </template>
              </v-checkbox>
              <p v-if="policyError" class="login-error-text">Debes aceptar las condiciones para iniciar sesion.</p>
            </div>

            <p v-if="credentialsError" class="login-error-text">{{ loginErrorMessage }}</p>

            <LoadingResult :state="feedbackState"  class="login-feedback" />

            <div class="login-secondary-actions">
              <v-btn variant="text" :disabled="isBusy" @click="router.push({ name: 'register' })">
                Crear usuario
              </v-btn>
            </div>

          </v-form>
        </div>

        <div class="movie-panel">
          <div class="movie-overlay" />
          <div class="movie-copy">
            <h2 class="movie-title">Tus películas favoritas, todo en un solo lugar</h2>
            <p class="movie-subtitle">Descubre estrenos, clásicos y recomendaciones personalizadas.</p>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped src="./Login.css"></style>