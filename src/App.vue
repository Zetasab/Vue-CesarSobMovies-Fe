<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import PrimeNavbar from './components/PrimeNavbar.vue'

const route = useRoute()
const showNavbar = computed(() => route.name !== 'login')
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

const currentYear = new Date().getFullYear()
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

@media (max-width: 760px) {
  .app-footer__inner {
    grid-template-columns: 1fr;
    text-align: center;
  }

  .app-footer__links {
    justify-content: center;
  }
}
</style>
