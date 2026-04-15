<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import MoviesScroller from '../../components/MoviesScroller.vue'
import { authService } from '../../services/authService'
import { tmdbApiService } from '../../services/tmdbApiService'

type TmdbMovie = {
  id: number
  title: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  release_date: string
  vote_average: number
  original_language: string
}

type TmdbNowPlayingResponse = {
  results: TmdbMovie[]
}

type MovieVideo = {
  id: string
  key: string
  site: string
  type: string
  official: boolean
}

type MovieVideosResponse = {
  results: MovieVideo[]
}

type TmdbTrendingPerson = {
  id: number
  name: string
  known_for_department: string
}

type TmdbTrendingPeopleResponse = {
  results: TmdbTrendingPerson[]
}

type TmdbGenre = {
  id: number
  name: string
}

type TmdbGenresResponse = {
  genres: TmdbGenre[]
}

type TrendWindow = 'day' | 'week'

type ScrollerMovie = {
  id: number
  title: string
  overview: string
  poster_path: string
  backdrop_path: string
  release_date: string
  vote_average: number
  original_language: string
}

const imageBaseUrl = 'https://image.tmdb.org/t/p'
const HEADER_VIDEO_DELAY_MS = 5000

const movies = ref<ScrollerMovie[]>([])
const heroMovies = ref<ScrollerMovie[]>([])
const heroMovieVideosById = ref<Record<number, MovieVideo | null>>({})
const activeHeroIndex = ref(0)
const showHeroVideo = ref(false)
const heroVideoDelayProgress = ref(0)
const heroSlideDirection = ref<1 | -1>(1)
const heroTouchStartX = ref<number | null>(null)
const heroTouchStartY = ref<number | null>(null)
const heroSwipeHandled = ref(false)
const trendingMovies = ref<ScrollerMovie[]>([])
const topRatedMovies = ref<ScrollerMovie[]>([])
const upcomingMovies = ref<ScrollerMovie[]>([])
const movieGenres = ref<TmdbGenre[]>([])
const trendingPeople = ref<TmdbTrendingPerson[]>([])
const selectedTrendWindow = ref<TrendWindow>('day')
const isHomeLoading = ref(true)
const router = useRouter()
let heroVideoTimeoutId: number | undefined
let heroVideoProgressIntervalId: number | undefined

const genreBackgroundClassById: Record<number, string> = {
  28: 'bg_Action',
  12: 'bg_Adventure',
  16: 'bg_Animation',
  35: 'bg_Comedy',
  80: 'bg_Crime',
  99: 'bg_Documentary',
  18: 'bg_Drama',
  10751: 'bg_Family',
  14: 'bg_Fantasy',
  36: 'bg_History',
  27: 'bg_Horror',
  10402: 'bg_Music',
  9648: 'bg_Mystery',
  10749: 'bg_Romance',
  878: 'bg_ScienceFiction',
  10770: 'bg_TVMovie',
  53: 'bg_Thriller',
  10752: 'bg_War',
  37: 'bg_Western'
}
const fallbackMovie: ScrollerMovie = {
  id: 0,
  title: 'Sin título',
  overview: '',
  poster_path: '',
  backdrop_path: '',
  release_date: '',
  vote_average: 0,
  original_language: 'en'
}

function normalizeMovie(movie: TmdbMovie): ScrollerMovie {
  return {
    id: movie.id,
    title: movie.title,
    overview: movie.overview,
    poster_path: movie.poster_path ?? '',
    backdrop_path: movie.backdrop_path ?? '',
    release_date: movie.release_date,
    vote_average: movie.vote_average,
    original_language: movie.original_language
  }
}

async function loadNowPlayingMovies(): Promise<void> {
  try {
    const response = await tmdbApiService.get<TmdbNowPlayingResponse>('movie/popular', {
      language: 'es-ES',
      page: 1
    })

    movies.value = response.results.map(normalizeMovie)
    heroMovies.value = movies.value.slice(0, 5)
    activeHeroIndex.value = 0
    showHeroVideo.value = false
    await loadHeroVideos(heroMovies.value)
  } catch {
    movies.value = []
    heroMovies.value = []
    heroMovieVideosById.value = {}
    activeHeroIndex.value = 0
    clearHeroVideoTimer()
  }
}

async function loadTopRatedMovies(): Promise<void> {
  try {
    const response = await tmdbApiService.get<TmdbNowPlayingResponse>('movie/top_rated', {
      language: 'es-ES',
      page: 1
    })

    topRatedMovies.value = response.results.map(normalizeMovie)
  } catch {
    topRatedMovies.value = []
  }
}

async function loadUpcomingMovies(): Promise<void> {
  try {
    const response = await tmdbApiService.get<TmdbNowPlayingResponse>('movie/upcoming', {
      language: 'es-ES',
      page: 1
    })

    upcomingMovies.value = response.results.map(normalizeMovie)
  } catch {
    upcomingMovies.value = []
  }
}

async function loadTrendingMovies(window: TrendWindow): Promise<void> {
  selectedTrendWindow.value = window

  try {
    const response = await tmdbApiService.get<TmdbNowPlayingResponse>(`trending/movie/${window}`, {
      language: 'es-ES'
    })

    trendingMovies.value = response.results.map(normalizeMovie)
  } catch {
    trendingMovies.value = []
  }
}

async function loadMovieGenres(): Promise<void> {
  try {
    const response = await tmdbApiService.get<TmdbGenresResponse>('genre/movie/list', {
      language: 'es-ES'
    })

    movieGenres.value = response.genres
  } catch {
    movieGenres.value = []
  }
}

async function loadTrendingPeople(): Promise<void> {
  try {
    const response = await tmdbApiService.get<TmdbTrendingPeopleResponse>('trending/person/day', {
      language: 'es-ES'
    })

    trendingPeople.value = response.results.slice(0, 8)
  } catch {
    trendingPeople.value = []
  }
}

const activeHeroMovie = computed<ScrollerMovie>(() => {
  if (!heroMovies.value.length) {
    return fallbackMovie
  }

  return heroMovies.value[activeHeroIndex.value] ?? fallbackMovie
})

const activeHeroBackdropUrl = computed(() => {
  if (activeHeroMovie.value.backdrop_path) {
    return `${imageBaseUrl}/original${activeHeroMovie.value.backdrop_path}`
  }

  if (activeHeroMovie.value.poster_path) {
    return `${imageBaseUrl}/original${activeHeroMovie.value.poster_path}`
  }

  return ''
})

const activeHeroVideo = computed(() => {
  const movieId = activeHeroMovie.value.id
  if (!movieId) {
    return null
  }

  return heroMovieVideosById.value[movieId] ?? null
})

const activeHeroVideoEmbedUrl = computed(() => {
  if (!activeHeroVideo.value?.key) {
    return ''
  }

  const trailerKey = activeHeroVideo.value.key
  return `https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&playsinline=1&loop=1&playlist=${trailerKey}`
})

const heroSlideTransitionName = computed(() => {
  return heroSlideDirection.value === 1 ? 'hero-slide-next' : 'hero-slide-prev'
})

const heroCountdownSecondsLeft = computed(() => {
  if (!activeHeroVideo.value || showHeroVideo.value) {
    return 0
  }

  const remainingMs = Math.max(0, HEADER_VIDEO_DELAY_MS - (heroVideoDelayProgress.value / 100) * HEADER_VIDEO_DELAY_MS)
  const remainingSeconds = Math.ceil(remainingMs / 1000)
  return Math.min(5, remainingSeconds)
})

const trendingHighlight = computed<ScrollerMovie>(() => {
  return trendingMovies.value[0] ?? fallbackMovie
})

const topRatedAverage = computed<string>(() => {
  if (!topRatedMovies.value.length) {
    return '0.0'
  }

  const list = topRatedMovies.value.slice(0, 10)
  const total = list.reduce((sum, movie) => sum + movie.vote_average, 0)
  return (total / list.length).toFixed(1)
})

const nextUpcomingMovie = computed<ScrollerMovie>(() => {
  if (!upcomingMovies.value.length) {
    return fallbackMovie
  }

  return (
    [...upcomingMovies.value]
      .filter((movie) => movie.release_date)
      .sort((a, b) => new Date(a.release_date).getTime() - new Date(b.release_date).getTime())[0] ??
    fallbackMovie
  )
})

onMounted(async () => {
  isHomeLoading.value = true

  const isValidLogin = await authService.checkLogin()
  if (!isValidLogin) {
    await router.replace({ name: 'login' })
    return
  }

  await Promise.allSettled([
    loadNowPlayingMovies(),
    loadTrendingMovies('day'),
    loadTopRatedMovies(),
    loadUpcomingMovies(),
    loadMovieGenres(),
    loadTrendingPeople()
  ])

  isHomeLoading.value = false
})

function formatYear(date: string): string {
  if (!date) {
    return '—'
  }

  return date.slice(0, 4)
}

function formatRating(voteAverage: number): string {
  return voteAverage.toFixed(1)
}

function formatDate(date: string): string {
  if (!date) {
    return 'Sin fecha'
  }

  return new Date(date).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

function getGenreBackgroundClass(genreId: number): string {
  return genreBackgroundClassById[genreId] ?? ''
}

function clearHeroVideoTimer(): void {
  if (typeof window === 'undefined') {
    return
  }

  if (heroVideoTimeoutId !== undefined) {
    window.clearTimeout(heroVideoTimeoutId)
    heroVideoTimeoutId = undefined
  }

  if (heroVideoProgressIntervalId !== undefined) {
    window.clearInterval(heroVideoProgressIntervalId)
    heroVideoProgressIntervalId = undefined
  }

  heroVideoDelayProgress.value = 0
}

function startHeroVideoDelayProgress(): void {
  if (typeof window === 'undefined') {
    return
  }

  const startedAt = Date.now()
  heroVideoDelayProgress.value = 0
  heroVideoProgressIntervalId = window.setInterval(() => {
    const elapsedMs = Date.now() - startedAt
    const progress = Math.min((elapsedMs / HEADER_VIDEO_DELAY_MS) * 100, 100)
    heroVideoDelayProgress.value = progress

    if (progress >= 100 && heroVideoProgressIntervalId !== undefined) {
      window.clearInterval(heroVideoProgressIntervalId)
      heroVideoProgressIntervalId = undefined
    }
  }, 60)
}

function scheduleHeroVideo(): void {
  clearHeroVideoTimer()
  showHeroVideo.value = false

  if (!activeHeroVideo.value || typeof window === 'undefined') {
    return
  }

  startHeroVideoDelayProgress()

  heroVideoTimeoutId = window.setTimeout(() => {
    showHeroVideo.value = true
    heroVideoDelayProgress.value = 100
    heroVideoTimeoutId = undefined
  }, HEADER_VIDEO_DELAY_MS)
}

function goToHeroMovie(index: number): void {
  if (!heroMovies.value.length) {
    return
  }

  const currentIndex = activeHeroIndex.value
  const normalizedIndex = ((index % heroMovies.value.length) + heroMovies.value.length) % heroMovies.value.length
  if (normalizedIndex === currentIndex) {
    return
  }

  const lastIndex = heroMovies.value.length - 1
  if (currentIndex === lastIndex && normalizedIndex === 0) {
    heroSlideDirection.value = 1
  } else if (currentIndex === 0 && normalizedIndex === lastIndex) {
    heroSlideDirection.value = -1
  } else {
    heroSlideDirection.value = normalizedIndex > currentIndex ? 1 : -1
  }

  activeHeroIndex.value = normalizedIndex
}

function goToNextHeroMovie(): void {
  goToHeroMovie(activeHeroIndex.value + 1)
}

function goToPreviousHeroMovie(): void {
  goToHeroMovie(activeHeroIndex.value - 1)
}

function onHeroTouchStart(event: TouchEvent): void {
  const touch = event.touches[0]
  if (!touch) {
    return
  }

  heroTouchStartX.value = touch.clientX
  heroTouchStartY.value = touch.clientY
  heroSwipeHandled.value = false
}

function onHeroTouchMove(event: TouchEvent): void {
  if (heroSwipeHandled.value) {
    return
  }

  const touch = event.touches[0]
  const startX = heroTouchStartX.value
  const startY = heroTouchStartY.value
  if (!touch || startX === null || startY === null) {
    return
  }

  const deltaX = touch.clientX - startX
  const deltaY = touch.clientY - startY
  const horizontalThreshold = 50
  const verticalTolerance = 36

  if (Math.abs(deltaX) >= horizontalThreshold && Math.abs(deltaY) <= verticalTolerance) {
    if (deltaX < 0) {
      goToNextHeroMovie()
    } else {
      goToPreviousHeroMovie()
    }

    heroSwipeHandled.value = true
  }
}

function onHeroTouchEnd(): void {
  heroTouchStartX.value = null
  heroTouchStartY.value = null
  heroSwipeHandled.value = false
}

function selectFeaturedVideo(videos: MovieVideo[]): MovieVideo | null {
  const youtubeVideos = videos.filter((video) => video.site === 'YouTube' && video.key)
  if (!youtubeVideos.length) {
    return null
  }

  const officialTrailer = youtubeVideos.find((video) => video.type === 'Trailer' && video.official)
  if (officialTrailer) {
    return officialTrailer
  }

  const trailer = youtubeVideos.find((video) => video.type === 'Trailer')
  if (trailer) {
    return trailer
  }

  return youtubeVideos[0] ?? null
}

async function loadHeroVideos(list: ScrollerMovie[]): Promise<void> {
  const firstFiveMovies = list.slice(0, 5)
  const entries = await Promise.all(
    firstFiveMovies.map(async (movie) => {
      try {
        const response = await tmdbApiService.get<MovieVideosResponse>(`movie/${movie.id}/videos`, {
          language: 'es-ES'
        })

        return [movie.id, selectFeaturedVideo(response.results ?? [])] as const
      } catch {
        return [movie.id, null] as const
      }
    })
  )

  heroMovieVideosById.value = Object.fromEntries(entries)
}

watch(activeHeroIndex, () => {
  scheduleHeroVideo()
})

watch(activeHeroVideo, () => {
  scheduleHeroVideo()
})

onBeforeUnmount(() => {
  clearHeroVideoTimer()
})
</script>

<template>
  <main class="home-page">
    <section v-if="isHomeLoading" class="home-loading-state" aria-label="Cargando inicio">
      <v-progress-circular indeterminate color="primary" size="56" width="5" />
      <p class="home-loading-text">Cargando inicio...</p>
    </section>

    <template v-else>
    <section
      class="home-hero"
      @touchstart.passive="onHeroTouchStart"
      @touchmove.passive="onHeroTouchMove"
      @touchend="onHeroTouchEnd"
      @touchcancel="onHeroTouchEnd"
    >
      <Transition :name="heroSlideTransitionName" mode="out-in">
        <div :key="activeHeroMovie.id || 'fallback'" class="home-hero-slide">
          <img
            v-if="activeHeroBackdropUrl"
            :src="activeHeroBackdropUrl"
            :alt="`Backdrop de ${activeHeroMovie.title}`"
            class="home-hero-image"
            :class="{ 'is-hidden': showHeroVideo && Boolean(activeHeroVideo) }"
          />
          <div
            v-else
            class="home-hero-image home-hero-image--fallback"
            :class="{ 'is-hidden': showHeroVideo && Boolean(activeHeroVideo) }"
            aria-hidden="true"
          ></div>

          <iframe
            v-if="activeHeroVideo && showHeroVideo"
            :key="`${activeHeroMovie.id}-${activeHeroVideo.key}`"
            :src="activeHeroVideoEmbedUrl"
            :title="`Trailer de ${activeHeroMovie.title}`"
            class="home-hero-video"
            frameborder="0"
            allow="autoplay; encrypted-media; picture-in-picture"
            tabindex="-1"
          ></iframe>

          <div class="home-hero-overlay" aria-hidden="true"></div>

          <div class="home-hero-bottom">
            <h1 class="home-title">{{ activeHeroMovie.title }}</h1>
            <div
              v-if="heroMovies.length > 1"
              class="home-hero-indicators"
              aria-label="Carrusel de películas populares"
            >
              <button
                v-for="(movie, index) in heroMovies"
                :key="movie.id"
                class="home-hero-indicator"
                :class="{ 'is-active': index === activeHeroIndex }"
                :aria-label="`Ver ${movie.title}`"
                type="button"
                @click="goToHeroMovie(index)"
              ></button>
            </div>
            <div
              v-if="activeHeroVideo && !showHeroVideo"
              class="home-hero-delay-slider"
              :aria-label="`Trailer en ${heroCountdownSecondsLeft} segundos`"
            >
              <div class="home-hero-delay-slider-label">Trailer en {{ heroCountdownSecondsLeft }}s</div>
              <div class="home-hero-delay-slider-track" aria-hidden="true">
                <span
                  class="home-hero-delay-slider-fill"
                  :style="{ width: `${Math.round(heroVideoDelayProgress)}%` }"
                ></span>
              </div>
            </div>
            <p class="home-bottom-meta">
              {{ formatYear(activeHeroMovie.release_date) }} · ⭐ {{ formatRating(activeHeroMovie.vote_average) }} ·
              {{ activeHeroMovie.original_language.toUpperCase() }}
            </p>
          </div>
        </div>
      </Transition>

      <div v-if="heroMovies.length > 1" class="home-hero-nav" aria-label="Navegación carrusel">
        <button
          class="home-hero-nav-button"
          type="button"
          aria-label="Película anterior"
          @click="goToPreviousHeroMovie"
        >
          <v-icon icon="mdi-chevron-left" size="24" />
        </button>
        <button
          class="home-hero-nav-button"
          type="button"
          aria-label="Siguiente película"
          @click="goToNextHeroMovie"
        >
          <v-icon icon="mdi-chevron-right" size="24" />
        </button>
      </div>

    </section>

    <section class="home-section">
      <h2 class="home-section-title">Películas populares</h2>
      <MoviesScroller :movies="movies" />
    </section>

    <section class="home-section">
      <h2 class="home-section-title">Tendencias</h2>
      <v-btn-toggle
        :model-value="selectedTrendWindow"
        color="primary"
        density="comfortable"
        mandatory
        class="mb-4"
      >
        <v-btn value="day" @click="loadTrendingMovies('day')">Hoy</v-btn>
        <v-btn value="week" @click="loadTrendingMovies('week')">Esta semana</v-btn>
      </v-btn-toggle>

      <MoviesScroller :movies="trendingMovies" />
    </section>

    <section class="home-section home-insights-section">
      <h2 class="home-section-title">Radar TMDB</h2>

      <div class="home-insights-grid">
        <article class="home-insight-card">
          <p class="home-insight-label">Más vista hoy</p>
          <h3 class="home-insight-title">{{ trendingHighlight.title || 'Sin datos disponibles' }}</h3>
          <p class="home-insight-meta">
            ⭐ {{ formatRating(trendingHighlight.vote_average) }} ·
            {{ formatYear(trendingHighlight.release_date) }}
          </p>
        </article>

        <article class="home-insight-card">
          <p class="home-insight-label">Media Top 10</p>
          <h3 class="home-insight-title">{{ topRatedAverage }}/10</h3>
          <p class="home-insight-meta">Valoración media en películas mejor puntuadas</p>
        </article>

        <article class="home-insight-card">
          <p class="home-insight-label">Próximo estreno</p>
          <h3 class="home-insight-title">{{ nextUpcomingMovie.title || 'Sin datos disponibles' }}</h3>
          <p class="home-insight-meta">{{ formatDate(nextUpcomingMovie.release_date) }}</p>
        </article>
      </div>

      <div v-if="trendingPeople.length" class="home-people">
        <h3 class="home-people-title">Personas en tendencia</h3>
        <div class="home-people-list">
          <span v-for="person in trendingPeople" :key="person.id" class="home-people-chip">
            {{ person.name }} · {{ person.known_for_department || 'Cine' }}
          </span>
        </div>
      </div>
    </section>

    <section class="home-section home-platforms-section">
      <div class="home-platforms-grid">
        <div class="home-platform-card home-platform-card--netflix"></div>
        <div class="home-platform-card home-platform-card--disney"></div>
        <div class="home-platform-card home-platform-card--prime"></div>
        <div class="home-platform-card home-platform-card--hbo"></div>
      </div>
    </section>

    <section class="home-parallax-cta" aria-label="Buscar películas">
      <div class="home-parallax-cta__overlay">
        <RouterLink to="/buscar" class="home-parallax-cta__link">
          <v-btn color="primary" size="large" class="home-parallax-cta__button">
            Buscar peliculas si no encuentras lo que buscas
          </v-btn>
        </RouterLink>
      </div>
    </section>

    <section class="home-section home-section--top-rated-large-cards">
      <h2 class="home-section-title">Mejor valoradas</h2>
      <MoviesScroller :movies="topRatedMovies" />
    </section>

    <section class="home-section home-section--upcoming-large-cards">
      <h2 class="home-section-title">Próximamente</h2>
      <MoviesScroller :movies="upcomingMovies" />
    </section>

    <section class="home-section home-genres-section">
      <h2 class="home-section-title">Géneros TMDB</h2>

      <div v-if="movieGenres.length" class="home-genres-grid" aria-label="Géneros de TMDB">
        <div
          v-for="genre in movieGenres"
          :key="genre.id"
          class="home-genre-chip card"
          :class="getGenreBackgroundClass(genre.id)"
        >
          {{ genre.name }}
        </div>
      </div>

      <p v-else class="home-genres-empty">No se pudieron cargar los géneros.</p>
    </section>
    </template>

  </main>
</template>

<style scoped src="./Home.css"></style>
