<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { authService } from '../services/authService'
import zetaMovAppLogo from '../assets/ZetaMovApp.png'

const route = useRoute()
const router = useRouter()

const isMobileMenuOpen = ref(false)
const isProfileMenuOpen = ref(false)
const isMobileViewport = ref(false)
const isScrolled = ref(false)

const isViewer = computed(() => (authService.getSession()?.role ?? '').trim().toLowerCase() === 'viewer')

const navigationLinks = computed(() => {
  const links = [
    { label: 'Inicio', to: '/', icon: 'mdi-home-outline' },
    { label: 'Buscar', to: '/buscar', icon: 'mdi-magnify' }
  ]

  if (!isViewer.value) {
    links.push({ label: 'Mis películas', to: '/mis-peliculas', icon: 'mdi-movie-open-outline' })
  }

  return links
})

const profileImg = computed(() => authService.getSession()?.profileImg ?? '')

const profileInitial = computed(() => {
  const username = authService.getSession()?.username ?? 'U'
  return username.slice(0, 1).toUpperCase()
})

watch(
  () => route.fullPath,
  () => {
    isMobileMenuOpen.value = false
    isProfileMenuOpen.value = false
  }
)

function updateViewport(): void {
  if (typeof window === 'undefined') {
    isMobileViewport.value = false
    return
  }

  isMobileViewport.value = window.matchMedia('(max-width: 900px)').matches
  if (!isMobileViewport.value) {
    isMobileMenuOpen.value = false
  }
}

function updateScrollState(): void {
  if (typeof window === 'undefined') {
    isScrolled.value = false
    return
  }

  isScrolled.value = window.scrollY > 12
}

onMounted(() => {
  updateViewport()
  updateScrollState()
  window.addEventListener('resize', updateViewport)
  window.addEventListener('scroll', updateScrollState, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('resize', updateViewport)
  window.removeEventListener('scroll', updateScrollState)
})

async function logout(): Promise<void> {
  isMobileMenuOpen.value = false
  isProfileMenuOpen.value = false
  authService.logout()
  await router.replace({ name: 'login' })
}

async function goToProfile(): Promise<void> {
  isProfileMenuOpen.value = false
  await router.push('/')
}

function onProfileTriggerClick(): void {
  if (!isMobileViewport.value) {
    return
  }

  isMobileMenuOpen.value = !isMobileMenuOpen.value
}
</script>

<template>
  <header class="prime-navbar" :class="{ 'is-scrolled': isScrolled }">
    <div class="prime-navbar__inner">
      <div class="prime-navbar__left">
        <RouterLink to="/" class="brand-link" aria-label="Ir a Inicio">
          <img :src="zetaMovAppLogo" alt="ZetaMoviesFe" class="brand-logo" />
          <span class="brand-title">ZetaMoviesFe</span>
        </RouterLink>
      </div>

      <div class="prime-navbar__links" :class="{ 'is-open': isMobileMenuOpen }">
        <RouterLink
          v-for="item in navigationLinks"
          :key="item.to"
          :to="item.to"
          class="nav-link"
          :class="{ 'is-active': route.path === item.to }"
        >
          <v-icon :icon="item.icon" size="18" class="nav-link__icon" />
          <span>{{ item.label }}</span>
        </RouterLink>

        <button class="mobile-logout" type="button" @click="logout">
          <v-icon icon="mdi-logout" size="18" />
          <span>Logout</span>
        </button>
      </div>

      <div></div>
      <div></div>

      <div class="prime-navbar__right">
        <v-menu v-model="isProfileMenuOpen" :disabled="isMobileViewport" location="bottom end" offset="10">
          <template #activator="{ props }">
            <button
              class="profile-trigger"
              v-bind="props"
              type="button"
              :aria-expanded="isMobileMenuOpen"
              aria-label="Abrir menú"
              @click="onProfileTriggerClick"
            >
              <img v-if="profileImg" :src="profileImg" alt="Perfil" class="profile-avatar" />
              <span v-else class="profile-avatar profile-avatar--fallback">{{ profileInitial }}</span>
            </button>
          </template>

          <v-list class="profile-menu" density="comfortable" bg-color="#08172d">
            <v-list-item prepend-icon="mdi-account-circle-outline" title="Perfil" @click="goToProfile" />
            <v-divider />
            <v-list-item
              v-for="item in navigationLinks"
              :key="`menu-${item.to}`"
              :prepend-icon="item.icon"
              :title="item.label"
              @click="router.push(item.to)"
            />
            <v-divider />
            <v-list-item class="logout-item" prepend-icon="mdi-logout" title="Logout" @click="logout" />
          </v-list>
        </v-menu>
      </div>
    </div>

    <div
      class="prime-navbar__mobile-row"
      :class="{ 'is-hidden': isScrolled || isMobileMenuOpen }"
      aria-label="Navegación móvil rápida"
    >
      <RouterLink
        v-for="item in navigationLinks"
        :key="`mobile-row-${item.to}`"
        :to="item.to"
        class="mobile-row-link"
        :class="{ 'is-active': route.path === item.to }"
      >
        <v-icon :icon="item.icon" size="16" />
        <span>{{ item.label }}</span>
      </RouterLink>
    </div>
  </header>
</template>

<style scoped>
.prime-navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 30;
  background: transparent;
  backdrop-filter: blur(0px);
  transition: background-color 0.28s ease, border-color 0.28s ease, backdrop-filter 0.28s ease;
}

.prime-navbar.is-scrolled {
  background: rgba(0, 5, 13, 0.84);
  backdrop-filter: blur(12px);
}

.prime-navbar__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 5.15rem;
  padding: 0.9rem clamp(1rem, 2.6vw, 2rem);
  gap: 1rem;
  transition: min-height 0.28s ease, padding 0.28s ease;
}

.prime-navbar.is-scrolled .prime-navbar__inner {
  min-height: 4.25rem;
  padding: 0.6rem clamp(0.8rem, 2.2vw, 1.6rem);
}

.prime-navbar__left {
  display: flex;
  align-items: center;
  gap: 0.7rem;
}

.brand-link {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  text-decoration: none;
}

.brand-logo {
  width: 2rem;
  height: 2rem;
  object-fit: contain;
}

.brand-title {
  color: #edf4ff;
  font-size: 1.03rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.prime-navbar__links {
  display: flex;
  align-items: center;
  gap: 0.2rem;
}

.prime-navbar__mobile-row {
  display: none;
}

.mobile-row-link {
  text-decoration: none;
}

.nav-link {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.38rem;
  padding: 0.55rem 0.72rem;
  border-radius: 0.45rem;
  color: #eaf2ff;
  border: 1px solid transparent;
  text-decoration: none;
  font-weight: 500;
  overflow: hidden;
  transition: color 0.22s ease, background-color 0.24s ease, transform 0.2s ease, box-shadow 0.24s ease;
}

.nav-link::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(135deg, rgba(35, 90, 170, 0.25), rgba(10, 45, 100, 0.08));
  opacity: 0;
  transform: scale(0.98);
  transition: opacity 0.24s ease, transform 0.24s ease;
}

.nav-link::after {
  content: '';
  position: absolute;
  left: 0.72rem;
  right: 0.72rem;
  bottom: 0.25rem;
  height: 2px;
  background: linear-gradient(90deg, #3b82f6, #60a5fa);
  transform: scaleX(0);
  transform-origin: center;
  transition: transform 0.25s ease, opacity 0.25s ease;
  opacity: 0;
}

.nav-link:hover {
  color: #0b2f63;
  background: #ffffff;
  border-color: #ffffff;
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(255, 255, 255, 0.2);
}

.nav-link:hover::before,
.nav-link.is-active::before {
  opacity: 1;
  transform: scale(1);
}

.nav-link:hover::after,
.nav-link.is-active::after {
  transform: scaleX(0);
}

.nav-link.is-active {
  color: #0b2f63;
  background: #ffffff;
  border-color: #ffffff;
  box-shadow: 0 6px 16px rgba(255, 255, 255, 0.2);
}

.nav-link__icon {
  opacity: 0.9;
  transition: color 0.2s ease, transform 0.2s ease;
}

.nav-link:hover .nav-link__icon,
.nav-link.is-active .nav-link__icon {
  color: #0b2f63;
  transform: translateY(-0.5px);
}

.profile-trigger {
  border: 0;
  padding: 0;
  background: transparent;
  cursor: pointer;
}

.profile-avatar {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 999px;
  object-fit: cover;
  border: 1px solid rgba(166, 193, 228, 0.42);
}

.profile-avatar--fallback {
  display: inline-grid;
  place-items: center;
  background: #10315f;
  color: #f3f8ff;
  font-size: 0.82rem;
  font-weight: 700;
}

.profile-menu {
  min-width: 14.5rem;
  border: 1px solid rgba(117, 147, 190, 0.24);
  border-radius: 0.6rem;
  overflow: hidden;
  color: #edf4ff;
}

.mobile-logout {
  display: none;
  align-items: center;
  justify-content: center;
  gap: 0.38rem;
  width: 100%;
  margin-top: 0.2rem;
  padding: 0.55rem 0.72rem;
  border: 0;
  border-radius: 0.45rem;
  background: transparent;
  color: rgb(var(--v-theme-error));
  font-weight: 600;
  cursor: pointer;
}

.mobile-logout:hover {
  background: rgba(var(--v-theme-error), 0.14);
}

:deep(.logout-item .v-list-item-title),
:deep(.logout-item .v-icon) {
  color: rgb(var(--v-theme-error));
}

@media (max-width: 900px) {
  .prime-navbar {
    background: rgba(0, 5, 13, 0.84);
    backdrop-filter: blur(12px);
  }

  .prime-navbar__inner {
    min-height: 4.3rem;
    padding: 0.55rem 0.9rem;
  }

  .prime-navbar.is-scrolled .prime-navbar__inner {
    min-height: 4.3rem;
    padding: 0.55rem 0.9rem;
  }

  .prime-navbar__inner {
    flex-wrap: wrap;
    align-items: center;
  }

  .prime-navbar__links {
    width: 100%;
    order: 3;
    display: none;
    flex-direction: column;
    align-items: stretch;
    padding-top: 0.25rem;
    border-top: 1px solid rgba(117, 147, 190, 0.2);
  }

  .prime-navbar__links.is-open {
    display: flex;
    margin-top: 0.35rem;
    padding: 0.45rem;
    border-top: 0;
    border: 1px solid rgba(84, 121, 177, 0.38);
    border-radius: 0.75rem;
    background: rgba(4, 18, 42, 0.9);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
  }

  .nav-link {
    justify-content: flex-start;
    width: 100%;
  }

  .mobile-logout {
    display: inline-flex;
  }

  .prime-navbar__right {
    margin-left: auto;
  }

  .profile-avatar {
    width: 2rem;
    height: 2rem;
  }

  .prime-navbar__mobile-row {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.35rem 0.95rem 0.55rem;
    background: rgba(0, 5, 13, 0.84);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    overflow-x: auto;
    overflow-y: hidden;
    white-space: nowrap;
    -ms-overflow-style: none;
    scrollbar-width: none;
    max-height: 3.2rem;
    opacity: 1;
    transform: translateY(0);
    transition: opacity 0.22s ease, transform 0.22s ease, max-height 0.22s ease, padding 0.22s ease;
  }

  .prime-navbar__mobile-row::-webkit-scrollbar {
    display: none;
    width: 0;
    height: 0;
  }

  .prime-navbar__mobile-row.is-hidden {
    opacity: 0;
    transform: translateY(-8px);
    max-height: 0;
    padding-top: 0;
    padding-bottom: 0;
    pointer-events: none;
  }

  .mobile-row-link {
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.42rem 0.62rem;
    border-radius: 0.45rem;
    border: 1px solid transparent;
    color: #eaf2ff;
    font-size: 0.83rem;
    font-weight: 600;
  }

  .mobile-row-link.is-active {
    color: #0b2f63;
    background: #ffffff;
    border-color: #ffffff;
  }
}
</style>
