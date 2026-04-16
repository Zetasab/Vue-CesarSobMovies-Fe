<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { computed } from 'vue'
import { authService } from '../services/authService'
import { watchedMoviesService } from '../services/watchedMoviesService'
import { wishlistMoviesService } from '../services/wishlistMoviesService'

type PrivateMovieItem = {
  _id?: string
  Title?: string
  OriginalTitle?: string
  IdTMDB?: number
  Id_TMDB?: number | string
  id_tmdb?: number | string
  idTmdb?: number | string
  Overview?: string
  PosterPath?: string
  poster_path?: string
  BackdropPath?: string
  ReleaseDate?: string
  VoteAverage?: number
  IsWatched?: boolean
  IsSeen?: boolean
  title?: string
  idTMDB?: number | string
  overview?: string
  posterPath?: string
  backdropPath?: string
  releaseDate?: string
  voteAverage?: number
  isWatched?: boolean
  isSeen?: boolean
}

const props = defineProps<{
  movies: PrivateMovieItem[]
}>()

const emit = defineEmits<{
  (event: 'refresh-needed'): void
}>()

const imageBaseUrl = 'https://image.tmdb.org/t/p'
type MovieActionType = 'seen' | 'watch'

const seenMovieIds = ref<Set<number>>(new Set())
const watchLaterMovieIds = ref<Set<number>>(new Set())
const mobileMenuMovieId = ref<number | null>(null)
const isMobileViewport = ref(false)
const isSuccessSnackbarOpen = ref(false)
const successSnackbarMessage = ref('')
const loadedPosterIds = ref<Set<number>>(new Set())
const pendingSeenMovieIds = ref<Set<number>>(new Set())
const pendingWatchMovieIds = ref<Set<number>>(new Set())
const isViewer = computed(() => (authService.getSession()?.role ?? '').trim().toLowerCase() === 'viewer')

function getMovieId(movie: PrivateMovieItem): number {
  const rawId = movie.IdTMDB ?? movie.idTMDB ?? movie.Id_TMDB ?? movie.id_tmdb ?? movie.idTmdb
  const parsedId = Number(rawId)

  return Number.isInteger(parsedId) && parsedId > 0 ? parsedId : 0
}

function getMovieTitle(movie: PrivateMovieItem): string {
  return movie.Title ?? movie.title ?? 'Sin título'
}

function getMovieOverview(movie: PrivateMovieItem): string {
  return movie.Overview ?? movie.overview ?? ''
}

function getPosterPath(movie: PrivateMovieItem): string {
  return movie.PosterPath ?? movie.posterPath ?? movie.poster_path ?? ''
}

function getReleaseDate(movie: PrivateMovieItem): string {
  return movie.ReleaseDate ?? movie.releaseDate ?? ''
}

function getVoteAverage(movie: PrivateMovieItem): number {
  return movie.VoteAverage ?? movie.voteAverage ?? 0
}

function isSeen(movie: PrivateMovieItem): boolean {
  const movieId = getMovieId(movie)
  return movieId > 0 && seenMovieIds.value.has(movieId)
}

function isWatched(movie: PrivateMovieItem): boolean {
  const movieId = getMovieId(movie)
  return movieId > 0 && watchLaterMovieIds.value.has(movieId)
}

function isMobileMenuOpen(movieId: number): boolean {
  return mobileMenuMovieId.value === movieId
}

function toggleMobileMenu(movieId: number): void {
  mobileMenuMovieId.value = mobileMenuMovieId.value === movieId ? null : movieId
}

function getPosterUrl(movie: PrivateMovieItem): string {
  const rawPath = getPosterPath(movie)

  if (!rawPath) {
    return ''
  }

  if (rawPath.startsWith('http://') || rawPath.startsWith('https://')) {
    return rawPath
  }

  const cleanedPath = rawPath
    .replace(/^\/?t\/p\/w\d+\//i, '')
    .replace(/^\/?w\d+\//i, '')

  const normalizedPath = cleanedPath.startsWith('/') ? cleanedPath : `/${cleanedPath}`
  const hasKnownExtension = /\.(jpg|jpeg|png|webp)$/i.test(normalizedPath)

  if (hasKnownExtension) {
    return `${imageBaseUrl}/w342${normalizedPath}`
  }

  return `${imageBaseUrl}/w342${normalizedPath}.jpg`
}

function formatYear(date: string): string {
  if (!date) {
    return '—'
  }

  return date.slice(0, 4)
}

function formatRating(voteAverage: number): string {
  return voteAverage.toFixed(1)
}

function isPosterLoaded(movie: PrivateMovieItem): boolean {
  const movieId = getMovieId(movie)
  return movieId > 0 && loadedPosterIds.value.has(movieId)
}

function markPosterAsLoaded(movie: PrivateMovieItem): void {
  const movieId = getMovieId(movie)
  if (movieId <= 0) {
    return
  }

  loadedPosterIds.value = new Set(loadedPosterIds.value).add(movieId)
}

function isSeenPending(movieId: number): boolean {
  return pendingSeenMovieIds.value.has(movieId)
}

function isWatchPending(movieId: number): boolean {
  return pendingWatchMovieIds.value.has(movieId)
}

async function toggleAction(movieId: number, action: MovieActionType): Promise<void> {
  const pendingSet = action === 'seen' ? pendingSeenMovieIds.value : pendingWatchMovieIds.value
  if (pendingSet.has(movieId)) {
    return
  }

  pendingSet.add(movieId)

  try {
    if (action === 'seen') {
      if (seenMovieIds.value.has(movieId)) {
        await watchedMoviesService.deleteMovie(movieId)
        seenMovieIds.value.delete(movieId)
      } else {
        await watchedMoviesService.addMovie(movieId)
        seenMovieIds.value.add(movieId)
      }
    } else if (watchLaterMovieIds.value.has(movieId)) {
      await wishlistMoviesService.deleteMovie(movieId)
      watchLaterMovieIds.value.delete(movieId)
    } else {
      await wishlistMoviesService.addMovie(movieId)
      watchLaterMovieIds.value.add(movieId)
    }

    successSnackbarMessage.value = 'Guardado correctamente'
    isSuccessSnackbarOpen.value = true
    emit('refresh-needed')
  } finally {
    pendingSet.delete(movieId)
  }
}

function toggleSeen(movieId: number): void {
  void toggleAction(movieId, 'seen')
}

function toggleWatch(movieId: number): void {
  void toggleAction(movieId, 'watch')
}

function updateViewport(): void {
  isMobileViewport.value = window.matchMedia('(max-width: 768px)').matches
  if (!isMobileViewport.value) {
    mobileMenuMovieId.value = null
  }
}

watch(
  () => props.movies,
  (movies) => {
    loadedPosterIds.value = new Set()

    seenMovieIds.value = new Set(
      movies.map((movie) => getMovieId(movie)).filter((movieId, index) => {
        const sourceMovie = movies[index]
        return movieId > 0 && Boolean(sourceMovie?.IsSeen ?? sourceMovie?.isSeen)
      })
    )

    watchLaterMovieIds.value = new Set(
      movies.map((movie) => getMovieId(movie)).filter((movieId, index) => {
        const sourceMovie = movies[index]
        return movieId > 0 && Boolean(sourceMovie?.IsWatched ?? sourceMovie?.isWatched)
      })
    )
  },
  { immediate: true, deep: true }
)

onMounted(() => {
  updateViewport()
  window.addEventListener('resize', updateViewport)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateViewport)
})
</script>

<template>
  <div class="my-movies-scroller">
    <div
      v-for="movie in props.movies"
      :key="movie._id ?? getMovieId(movie)"
      class="my-movie-card"
      :class="{ 'is-mobile-menu-open': isMobileMenuOpen(getMovieId(movie)) }"
    >
      <RouterLink
        class="my-movie-poster-link"
        :to="{ name: 'detailed-movie', params: { idtmdb: getMovieId(movie) } }"
        :aria-label="`Ver detalle de ${getMovieTitle(movie)}`"
      >
        <v-skeleton-loader
          v-if="getPosterUrl(movie) && !isPosterLoaded(movie)"
          type="image"
          class="my-movie-poster-skeleton"
        />
        <img
          v-if="getPosterUrl(movie)"
          :src="getPosterUrl(movie)"
          :alt="getMovieTitle(movie)"
          class="my-movie-poster"
          :class="{ 'is-loaded': isPosterLoaded(movie) }"
          loading="lazy"
          @load="markPosterAsLoaded(movie)"
          @error="markPosterAsLoaded(movie)"
        />
        <div v-else class="my-movie-poster my-movie-poster--fallback">
          <v-icon icon="mdi-image-off-outline" size="26" />
        </div>
      </RouterLink>

      <div class="my-movie-base-info">
        <h3 class="my-movie-title">{{ getMovieTitle(movie) }}</h3>
        <p class="my-movie-meta">{{ formatYear(getReleaseDate(movie)) }}</p>
      </div>

      <div class="my-movie-hover-info">
        <p class="my-movie-hover-rating">⭐ {{ formatRating(getVoteAverage(movie)) }}</p>
        <p class="my-movie-overview">{{ getMovieOverview(movie) }}</p>
        <div v-if="!isViewer" class="my-movie-actions">
          <button
            class="my-movie-action my-movie-action--seen"
            :class="{ 'is-active': isSeen(movie) }"
            type="button"
            :disabled="isSeenPending(getMovieId(movie))"
            aria-label="Marcar como vista"
            @click.stop="toggleSeen(getMovieId(movie))"
          >
            <v-icon :icon="isSeen(movie) ? 'mdi-check-circle' : 'mdi-check-circle-outline'" size="20" />
          </button>

          <button
            class="my-movie-action my-movie-action--watch"
            :class="{ 'is-active': isWatched(movie) }"
            type="button"
            :disabled="isWatchPending(getMovieId(movie))"
            aria-label="Añadir a quiero ver"
            @click.stop="toggleWatch(getMovieId(movie))"
          >
            <v-icon :icon="isWatched(movie) ? 'mdi-bookmark' : 'mdi-bookmark-plus-outline'" size="20" />
          </button>
        </div>
      </div>

      <button
        class="my-movie-mobile-menu-toggle"
        type="button"
        aria-label="Abrir menú"
        :aria-expanded="isMobileMenuOpen(getMovieId(movie))"
        @pointerdown.stop
        @click.stop="toggleMobileMenu(getMovieId(movie))"
      >
        <v-icon :icon="isMobileMenuOpen(getMovieId(movie)) ? 'mdi-close' : 'mdi-dots-vertical'" size="18" />
      </button>
    </div>
  </div>

  <v-snackbar v-model="isSuccessSnackbarOpen" color="success" timeout="1800">
    {{ successSnackbarMessage }}
  </v-snackbar>
</template>

<style scoped>
.my-movies-scroller {
  margin-top: 1rem;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(11.5rem, 1fr));
  gap: 0.95rem;
  height: auto;
  max-height: none;
  overflow: visible;
}

.my-movie-card {
  position: relative;
  overflow: hidden;
  border-radius: 0.9rem;
  background: #091321;
  transition: transform 0.25s ease;
}

.my-movie-card.is-desktop-menu-open {
  overflow: visible;
  z-index: 9;
}

.my-movie-card:hover {
  transform: translateY(-5px);
}

.my-movie-poster-link {
  position: relative;
  display: block;
}

.my-movie-poster {
  position: relative;
  z-index: 1;
  width: 100%;
  aspect-ratio: 2 / 3;
  object-fit: cover;
  display: block;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.my-movie-poster.is-loaded {
  opacity: 1;
}

.my-movie-poster--fallback {
  display: grid;
  place-items: center;
  background: linear-gradient(160deg, #0c1b31, #081425);
  color: #b6cbe8;
}

.my-movie-poster-skeleton {
  position: absolute;
  inset: 0;
  z-index: 0;
}

.my-movie-base-info {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1;
  pointer-events: none;
  padding: 0.75rem 0.7rem;
  background: linear-gradient(to top, rgba(0, 8, 18, 0.96), rgba(0, 8, 18, 0.62), transparent);
}

.my-movie-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1.35;
  color: #f6fbff;
}

.my-movie-meta {
  margin: 0.22rem 0 0;
  font-size: 0.78rem;
  color: #cdd9ea;
}

.my-movie-hover-info {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 0.7rem;
  background: linear-gradient(to top, rgba(2, 10, 22, 0.98), rgba(2, 10, 22, 0.84), rgba(2, 10, 22, 0.2));
  opacity: 0;
  transform: translateY(8px);
  transition: opacity 0.22s ease, transform 0.22s ease;
}

.my-movie-actions,
.my-movie-action-wrapper,
.my-movie-action-menu,
.my-movie-action {
  pointer-events: auto;
}

.my-movie-card:hover .my-movie-hover-info,
.my-movie-card:focus-within .my-movie-hover-info {
  opacity: 1;
  transform: translateY(0);
}

.my-movie-overview {
  margin: 0;
  display: -webkit-box;
  line-clamp: 5;
  -webkit-line-clamp: 5;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 0.78rem;
  line-height: 1.42;
  color: #d7e2f1;
}

.my-movie-hover-rating {
  margin: 0;
  font-size: 0.8rem;
  font-weight: 600;
  color: #d9e7fb;
}

.my-movie-actions {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin-left: auto;
}

.my-movie-action-wrapper {
  position: relative;
  display: inline-flex;
}

.my-movie-action-wrapper.is-open {
  z-index: 7;
}

.my-movie-action-menu {
  position: absolute;
  right: calc(100% + 0.4rem);
  bottom: 0;
  z-index: 5;
  min-width: 8rem;
  border-radius: 0.5rem;
  padding: 0.35rem;
  background: rgba(8, 19, 35, 0.95);
  border: 1px solid rgba(109, 143, 194, 0.3);
  color: #f7fbff;
  font-size: 0.75rem;
}

.my-movie-menu-state {
  padding: 0.3rem 0.4rem;
  color: #d9e7fb;
}

.my-movie-dialog-section-title {
  margin: 0.35rem 0.4rem 0.25rem;
  font-size: 0.68rem;
  color: #aac2e2;
}

.my-movie-dialog-section-title + .my-movie-dialog-list-item {
  margin-bottom: 0.3rem;
}

.my-movie-dialog-list-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  border: 0;
  border-radius: 0.45rem;
  padding: 0.4rem 0.5rem;
  text-align: left;
  background: transparent;
  color: #f7fbff;
  cursor: pointer;
}

.my-movie-dialog-list-item.is-active {
  background: rgba(34, 197, 94, 0.26);
}

.my-movie-dialog-list-item--private.is-active {
  background: rgba(59, 130, 246, 0.28);
}

.my-movie-menu-item-check {
  color: #22c55e;
}

.my-movie-dialog-list-item--private .my-movie-menu-item-check {
  color: #3b82f6;
}

.my-movie-dialog-list-item:hover {
  background: rgba(38, 63, 102, 0.4);
}

.my-movie-dialog-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.my-movie-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 0;
  border-radius: 999px;
  color: #f7fbff;
  cursor: pointer;
  transition: transform 0.2s ease, filter 0.2s ease;
}

.my-movie-action:hover {
  transform: translateY(-1px);
  filter: brightness(1.06);
}

.my-movie-mobile-menu-toggle {
  display: none;
}

.my-movie-action--seen {
  background: #1d9f5a;
}

.my-movie-action--seen.is-active {
  background: #22c55e;
}

.my-movie-action--watch {
  background: #2563eb;
}

.my-movie-action--watch.is-active {
  background: #3b82f6;
}

@media (max-width: 768px) {
  .my-movies-scroller {
    grid-template-columns: repeat(auto-fill, minmax(10.4rem, 1fr));
  }

  .my-movie-card {
    min-width: 0;
  }

  .my-movie-card:hover {
    transform: none;
  }

  .my-movie-hover-info {
    opacity: 0;
    transform: translateY(8px);
    pointer-events: none;
    gap: 0.6rem;
    background: linear-gradient(to top, rgba(2, 10, 22, 0.92), rgba(2, 10, 22, 0.54), rgba(2, 10, 22, 0));
  }

  .my-movie-card:hover .my-movie-hover-info,
  .my-movie-card:focus-within .my-movie-hover-info {
    opacity: 0;
    transform: translateY(8px);
  }

  .my-movie-card.is-mobile-menu-open .my-movie-hover-info {
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
  }

  .my-movie-hover-rating,
  .my-movie-overview,
  .my-movie-actions {
    transform: translateY(12px);
    opacity: 0;
    transition: transform 0.22s ease, opacity 0.22s ease;
  }

  .my-movie-card.is-mobile-menu-open .my-movie-hover-rating,
  .my-movie-card.is-mobile-menu-open .my-movie-overview,
  .my-movie-card.is-mobile-menu-open .my-movie-actions {
    transform: translateY(0);
    opacity: 1;
  }

  .my-movie-hover-rating {
    font-size: 0.75rem;
  }

  .my-movie-actions {
    order: -1;
    align-self: flex-end;
    border-radius: 999px;
    padding: 0.2rem;
  }

  .my-movie-card.is-mobile-menu-open .my-movie-actions {
    transform: translateY(0);
    opacity: 1;
  }

  .my-movie-action:hover {
    transform: none;
    filter: none;
  }

  .my-movie-mobile-menu-toggle {
    position: absolute;
    right: 0.55rem;
    bottom: 0.55rem;
    z-index: 3;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border: 0;
    border-radius: 999px;
    color: #f7fbff;
    background: rgba(8, 20, 38, 0.88);
    cursor: pointer;
  }

  .my-movie-card.is-mobile-menu-open .my-movie-mobile-menu-toggle {
    background: rgba(21, 39, 66, 0.96);
  }
}
</style>
