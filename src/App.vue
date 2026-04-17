<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import PrimeNavbar from './components/PrimeNavbar.vue'
import { authService } from './services/authService'

const route = useRoute()
const showNavbar = computed(() => !['login', 'privacy-policy', 'register', 'verify-email', 'forgot-password'].includes(String(route.name ?? '')))
const overlayNavbarRoutes = ['home', 'search', 'my-movies', 'my-lists', 'detailed-movie']
const isMobileViewport = ref(false)

function updateViewport(): void {
  if (typeof window === 'undefined') {
    isMobileViewport.value = false
    return
  }

  isMobileViewport.value = window.matchMedia('(max-width: 900px)').matches
}

onMounted(() => {
  updateViewport()
  window.addEventListener('resize', updateViewport)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateViewport)
})

const useNavbarOverlay = computed(
  () => overlayNavbarRoutes.includes(String(route.name ?? '')) && !isMobileViewport.value
)

const isSocialFabOpen = ref(false)
const isAuthenticated = ref(false)
const showSocialFab = computed(() => showNavbar.value && isAuthenticated.value)

function refreshAuthState(): void {
  isAuthenticated.value = authService.isAuthenticated()
}

function onWindowFocus(): void {
  refreshAuthState()
}

watch(
  () => route.fullPath,
  () => {
    isSocialFabOpen.value = false
    refreshAuthState()
  }
)

function toggleSocialFab(): void {
  isSocialFabOpen.value = !isSocialFabOpen.value
}

const currentYear = new Date().getFullYear()

onMounted(() => {
  refreshAuthState()
  window.addEventListener('focus', onWindowFocus)
})

onUnmounted(() => {
  window.removeEventListener('focus', onWindowFocus)
})
</script>

<template>
  <div class="app-shell">
    <PrimeNavbar v-if="showNavbar" />

    <div class="app-content" :class="{ 'app-content--with-navbar': showNavbar && !useNavbarOverlay }">
      <RouterView />
    </div>

    <footer v-if="showNavbar" class="app-footer">
      <div class="app-footer__inner">
        <p class="app-footer__brand">ZetaMoviesFe</p>
        <nav class="app-footer__links" aria-label="Footer links">
          <RouterLink to="/">Inicio</RouterLink>
          <RouterLink to="/buscar">Buscar</RouterLink>
          <RouterLink to="/mis-peliculas">Mis películas</RouterLink>
          <RouterLink to="/mis-listas">Mis listas</RouterLink>
        </nav>
        <p class="app-footer__copy">© {{ currentYear }} ZetaMoviesFe</p>
      </div>
    </footer>

    <div v-if="showSocialFab" class="social-fab">
      <Transition name="social-fab-panel">
        <div v-if="isSocialFabOpen" class="social-fab__panel" aria-label="Redes sociales">
          <a class="social-fab__link" href="mailto:cesarsobworkspace@gmail.com" aria-label="Enviar email">
            <v-icon icon="mdi-email-outline" size="20" />
          </a>
          <a
            class="social-fab__link"
            href="https://www.linkedin.com/in/cesar-sobrino-arribas-1b887021b/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Abrir LinkedIn"
          >
            <v-icon icon="mdi-linkedin" size="20" />
          </a>
          <a
            class="social-fab__link"
            href="https://github.com/Zetasab"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Abrir GitHub"
          >
            <v-icon icon="mdi-github" size="20" />
          </a>
        </div>
      </Transition>

      <button class="social-fab__trigger" type="button" @click="toggleSocialFab" aria-label="Mostrar redes sociales">
        <v-icon :icon="isSocialFabOpen ? 'mdi-close' : 'mdi-share-variant'" size="22" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
}

.app-content {
  flex: 1;
}

.app-content--with-navbar {
  padding-top: 4.25rem;
}

.app-footer {
  border-top: 1px solid rgba(120, 156, 214, 0.28);
  background: rgba(8, 23, 45, 0.82);
  backdrop-filter: blur(8px);
}

.app-footer__inner {
  margin: 0 auto;
  width: min(1200px, 100%);
  padding: 0.95rem clamp(1rem, 2.8vw, 2rem);
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.9rem;
}

.app-footer__brand,
.app-footer__copy {
  margin: 0;
  color: #d6e2f2;
  font-size: 0.86rem;
}

.app-footer__brand {
  font-weight: 700;
  color: #edf4ff;
}

.app-footer__links {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.8rem;
  flex-wrap: wrap;
}

.app-footer__links a {
  color: #c7d8ef;
  text-decoration: none;
  font-size: 0.84rem;
}

.app-footer__links a:hover {
  color: #edf4ff;
}

.social-fab {
  position: fixed;
  right: 1.1rem;
  bottom: 1.2rem;
  z-index: 50;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.65rem;
}

.social-fab__trigger {
  width: 3rem;
  height: 3rem;
  border: 0;
  border-radius: 999px;
  cursor: pointer;
  color: #e0f2fe;
  background: radial-gradient(circle at 35% 25%, #2563eb, #0f172a 82%);
  box-shadow: 0 10px 28px rgba(8, 47, 122, 0.45);
  display: grid;
  place-items: center;
  transition: transform 180ms ease;
}

.social-fab__trigger:hover {
  transform: translateY(-2px) scale(1.02);
}

.social-fab__panel {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.5rem;
  border-radius: 999px;
  background: rgba(8, 23, 45, 0.92);
  border: 1px solid rgba(148, 163, 184, 0.35);
  box-shadow: 0 10px 30px rgba(2, 6, 23, 0.35);
}

.social-fab__link {
  width: 2.2rem;
  height: 2.2rem;
  border-radius: 999px;
  color: #dbeafe;
  background: rgba(37, 99, 235, 0.2);
  display: grid;
  place-items: center;
  text-decoration: none;
  transition: background-color 160ms ease, transform 160ms ease;
}

.social-fab__link:hover {
  background: rgba(37, 99, 235, 0.42);
  transform: translateY(-1px);
}

.social-fab-panel-enter-active,
.social-fab-panel-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
}

.social-fab-panel-enter-from,
.social-fab-panel-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.96);
}

@media (max-width: 760px) {
  .app-footer__inner {
    grid-template-columns: 1fr;
    text-align: center;
  }

  .app-footer__links {
    justify-content: center;
  }

  .social-fab {
    right: 0.8rem;
    bottom: 0.9rem;
  }
}
</style>
