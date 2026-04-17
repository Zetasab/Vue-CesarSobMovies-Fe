import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home/Home.vue'
import Login from '../views/Login/Login.vue'
import DetailedMovie from '../views/DetailedMovie/DetailedMovie.vue'
import MyMovies from '../views/MyMovies/MyMovies.vue'
import MyLists from '../views/MyLists/MyLists.vue'
import MoviesByList from '../views/MoviesByList/MoviesByList.vue'
import Search from '../views/Search/Search.vue'
import PrivacyPolicy from '../views/PrivacyPolicy/PrivacyPolicy.vue'
import Register from '../views/Register/Register.vue'
import VerifyEmail from '../views/VerifyEmail/VerifyEmail.vue'
import ForgotPassword from '../views/ForgotPassword/ForgotPassword.vue'
import { authService } from '../services/authService'

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior() {
    return { top: 0, left: 0 }
  },
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home,
      meta: { requiresAuth: true }
    },
    {
      path: '/buscar',
      name: 'search',
      component: Search,
      meta: { requiresAuth: true }
    },
    {
      path: '/mis-peliculas',
      name: 'my-movies',
      component: MyMovies,
      meta: { requiresAuth: true }
    },
    {
      path: '/mis-listas',
      name: 'my-lists',
      component: MyLists,
      meta: { requiresAuth: true }
    },
    {
      path: '/mis-listas/:listId/peliculas',
      name: 'movies-by-list',
      component: MoviesByList,
      meta: { requiresAuth: true }
    },
    {
      path: '/movie/:idtmdb',
      name: 'detailed-movie',
      component: DetailedMovie,
      meta: { requiresAuth: true }
    },
    {
      path: '/login',
      name: 'login',
      component: Login
    },
    {
      path: '/politica-privacidad-condiciones-uso',
      name: 'privacy-policy',
      component: PrivacyPolicy
    },
    {
      path: '/register',
      name: 'register',
      component: Register
    },
    {
      path: '/verify-email',
      name: 'verify-email',
      component: VerifyEmail
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: ForgotPassword
    }
  ]
})

router.beforeEach((to) => {
  const isAuthenticated = authService.isAuthenticated()
  const currentRole = (authService.getSession()?.role ?? '').trim().toLowerCase()
  const isViewer = currentRole === 'viewer'

  if (to.meta.requiresAuth && !isAuthenticated) {
    return { name: 'login' }
  }

  if (to.name === 'my-movies' && isViewer) {
    return { name: 'home' }
  }

  if (to.name === 'login' && isAuthenticated) {
    return { name: 'home' }
  }

  return true
})

export default router
