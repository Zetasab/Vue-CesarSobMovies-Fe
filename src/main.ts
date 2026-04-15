import { createApp } from 'vue'
import './main.css'
import 'lenis/dist/lenis.css'
import App from './App.vue'
import router from './router'
import { authService } from './services/authService'
import { BaseApiService } from './services/baseApiService'
import zetaMovAppLogo from './assets/ZetaMovApp.png'
import Lenis from 'lenis'

import '@fontsource/roboto/100.css'
import '@fontsource/roboto/300.css'
import '@fontsource/roboto/400.css'
import '@fontsource/roboto/500.css'
import '@fontsource/roboto/700.css'
import '@fontsource/roboto/900.css'

/* optional italic styles */
import '@fontsource/roboto/100-italic.css'
import '@fontsource/roboto/300-italic.css'
import '@fontsource/roboto/400-italic.css'
import '@fontsource/roboto/500-italic.css'
import '@fontsource/roboto/700-italic.css'
import '@fontsource/roboto/900-italic.css'
import '@fontsource/montserrat/400.css'
import '@fontsource/montserrat/500.css'
import '@fontsource/montserrat/700.css'
import '@mdi/font/css/materialdesignicons.css'

import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { aliases, mdi } from 'vuetify/iconsets/mdi'

const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'primeDark',
    themes: {
      primeDark: {
        dark: true,
        colors: {
          background: '#00050d',
          surface: '#08172d',
          primary: '#0b2f63',
          secondary: '#102543',
          info: '#1d4f93',
          success: '#22c55e',
          warning: '#f59e0b',
          error: '#ef4444'
        }
      }
    }
  },
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: {
      mdi,
    },
  },
})

const app = createApp(App)

if ('scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual'
}

BaseApiService.setUnauthorizedHandler(() => {
  authService.logout()

  if (router.currentRoute.value.name !== 'login') {
    router.replace({ name: 'login' })
  }
})

const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]') ?? document.createElement('link')
favicon.rel = 'icon'
favicon.type = 'image/png'
favicon.href = zetaMovAppLogo

if (!favicon.parentNode) {
  document.head.appendChild(favicon)
}

if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const lenis = new Lenis({
    duration: 1.2,
    lerp: 0.08,
    wheelMultiplier: 0.9,
    touchMultiplier: 1.15,
    smoothWheel: true
  })

  const raf = (time: number) => {
    lenis.raf(time)
    window.requestAnimationFrame(raf)
  }

  window.requestAnimationFrame(raf)

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      lenis.stop()
      return
    }

    lenis.start()
  })
}

app.use(router)
.use(vuetify)

router.isReady().then(() => {
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
})

app.mount('#app')