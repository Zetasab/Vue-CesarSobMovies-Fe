<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import LoadingResult from '../../components/LoadingResult.vue'
import { authService } from '../../services/authService'
import zetaMovAppLogo from '../../assets/ZetaMovApp.png'

type FeedbackState = 'idle' | 'loading' | 'correct' | 'wrong'

const router = useRouter()

const state = reactive({
  email: '',
  password: ''
})

const feedbackState = ref<FeedbackState>('idle')
const credentialsError = ref(false)
const loginErrorMessage = ref('')
const isBusy = computed(() => feedbackState.value !== 'idle')

const showPassword = ref(false)
const rememberUser = ref(false)
const proyect = 'mvs'

onMounted(() => {
  const rememberedEmail = authService.getRememberedUsername()
  const rememberedPassword = authService.getRememberedPassword()

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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

async function onSubmit(): Promise<void> {
  if (feedbackState.value !== 'idle') {
    return
  }

  credentialsError.value = false
  loginErrorMessage.value = ''
  feedbackState.value = 'loading'

  const isValidLogin = await authService.login(state.email, state.password, proyect)

  feedbackState.value = isValidLogin ? 'correct' : 'wrong'

  if (isValidLogin) {
    if (rememberUser.value) {
      authService.saveRememberedUsername(state.email)
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

            <v-checkbox
              v-model="rememberUser"
              label="Recordar email"
              :disabled="isBusy"
              color="primary"
              density="comfortable"
              hide-details
              class="login-remember"
            />

            <p v-if="credentialsError" class="login-error-text">{{ loginErrorMessage }}</p>

            <LoadingResult :state="feedbackState"  class="login-feedback" />

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