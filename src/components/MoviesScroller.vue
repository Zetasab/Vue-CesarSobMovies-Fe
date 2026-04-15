<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { MovieModel } from '../models/MovieModel'
import { MovieUsersListsModel } from '../models/MovieUsersListsModel'
import { moviePrivateUserListService } from '../services/moviePrivateUserListService'
import { movieUsersListsService } from '../services/movieUsersListsService'

interface MovieItem {
  id: number
  title: string
  overview: string
  poster_path?: string
  posterPath?: string
  backdrop_path?: string
  backdropPath?: string
  release_date: string
  vote_average: number
}

const props = defineProps<{
  movies: MovieItem[]
  layout?: 'scroller' | 'grid'
}>()

const isGridLayout = computed(() => props.layout === 'grid')

const imageBaseUrl = 'https://image.tmdb.org/t/p'
const scrollerRef = ref<HTMLDivElement | null>(null)
const isDragging = ref(false)
const dragStartX = ref(0)
const startScrollLeft = ref(0)
const didDrag = ref(false)
const suppressPosterClick = ref(false)
const pendingScrollTimeoutId = ref<number | null>(null)
const pendingScrollLeft = ref<number | null>(null)

const DRAG_THRESHOLD_PX = 6
const SCROLL_DELAY_MS = 70

const seenMovieIds = ref<Set<number>>(new Set())
const watchLaterMovieIds = ref<Set<number>>(new Set())
const mobileMenuMovieId = ref<number | null>(null)
const isMobileViewport = ref(false)
const desktopMenuKey = ref<string | null>(null)
const isMobileActionDialogOpen = ref(false)
const userLists = ref<MovieUsersListsModel[]>([])
const isLoadingActionLists = ref(false)
const actionListsError = ref('')
const selectedAction = ref<MovieActionType | null>(null)
const selectedMovieId = ref<number | null>(null)
const listMembershipById = ref<Record<string, boolean>>({})
const pendingListId = ref<string | null>(null)
const isPrivateListActive = ref(false)
const isPrivateListPending = ref(false)
const isSuccessSnackbarOpen = ref(false)
const successSnackbarMessage = ref('')
const loadedPosterIds = ref<Set<number>>(new Set())

type MovieActionType = 'seen' | 'watch'

function getPosterUrl(path?: string): string {
  if (!path) {
    return ''
  }

  return `${imageBaseUrl}/w342${path}`
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

function isPosterLoaded(movieId: number): boolean {
  return loadedPosterIds.value.has(movieId)
}

function markPosterAsLoaded(movieId: number): void {
  loadedPosterIds.value = new Set(loadedPosterIds.value).add(movieId)
}

function onPosterContextMenu(event: MouseEvent): void {
  if (isMobileViewport.value) {
    event.preventDefault()
  }
}

function onPosterClick(event: MouseEvent): void {
  if (suppressPosterClick.value) {
    event.preventDefault()
    event.stopPropagation()
  }
}

function onDragStart(event: MouseEvent): void {
  if (isGridLayout.value) {
    return
  }

  const container = scrollerRef.value
  if (!container) {
    return
  }

  isDragging.value = true
  didDrag.value = false
  dragStartX.value = event.clientX
  startScrollLeft.value = container.scrollLeft
}

function onDragMove(event: MouseEvent): void {
  if (isGridLayout.value) {
    return
  }

  const container = scrollerRef.value
  if (!container || !isDragging.value) {
    return
  }

  const deltaX = event.clientX - dragStartX.value

  if (!didDrag.value && Math.abs(deltaX) < DRAG_THRESHOLD_PX) {
    return
  }

  if (!didDrag.value) {
    didDrag.value = true
    suppressPosterClick.value = true
  }

  event.preventDefault()
  scheduleScrollPosition(startScrollLeft.value - deltaX * 1.25)
}

function onDragEnd(): void {
  if (isGridLayout.value) {
    return
  }

  flushPendingScrollPosition()
  isDragging.value = false
  if (didDrag.value) {
    window.setTimeout(() => {
      suppressPosterClick.value = false
    }, 0)
  }
}

function scheduleScrollPosition(nextScrollLeft: number): void {
  const container = scrollerRef.value
  if (!container) {
    return
  }

  pendingScrollLeft.value = nextScrollLeft

  if (pendingScrollTimeoutId.value !== null) {
    window.clearTimeout(pendingScrollTimeoutId.value)
  }

  pendingScrollTimeoutId.value = window.setTimeout(() => {
    if (!scrollerRef.value || pendingScrollLeft.value === null) {
      pendingScrollTimeoutId.value = null
      return
    }

    scrollerRef.value.scrollLeft = pendingScrollLeft.value
    pendingScrollTimeoutId.value = null
    pendingScrollLeft.value = null
  }, SCROLL_DELAY_MS)
}

function flushPendingScrollPosition(): void {
  if (pendingScrollTimeoutId.value !== null) {
    window.clearTimeout(pendingScrollTimeoutId.value)
    pendingScrollTimeoutId.value = null
  }

  if (scrollerRef.value && pendingScrollLeft.value !== null) {
    scrollerRef.value.scrollLeft = pendingScrollLeft.value
  }

  pendingScrollLeft.value = null
}

function isSeen(movieId: number): boolean {
  return seenMovieIds.value.has(movieId)
}

function isWatchLater(movieId: number): boolean {
  return watchLaterMovieIds.value.has(movieId)
}

function isMobileMenuOpen(movieId: number): boolean {
  return mobileMenuMovieId.value === movieId
}

function toggleMobileMenu(movieId: number): void {
  mobileMenuMovieId.value = mobileMenuMovieId.value === movieId ? null : movieId
}

function closeMobileMenu(movieId: number): void {
  if (mobileMenuMovieId.value === movieId) {
    mobileMenuMovieId.value = null
  }
}

function getActionKey(movieId: number, action: MovieActionType): string {
  return `${movieId}-${action}`
}

function isDesktopMenuOpen(movieId: number, action: MovieActionType): boolean {
  return !isMobileViewport.value && desktopMenuKey.value === getActionKey(movieId, action)
}

function isMovieDesktopMenuOpen(movieId: number): boolean {
  if (isMobileViewport.value || !desktopMenuKey.value) {
    return false
  }

  return desktopMenuKey.value.startsWith(`${movieId}-`)
}

function isListActive(listId: string): boolean {
  return Boolean(listMembershipById.value[listId])
}

function buildMovieModel(movieId: number): MovieModel | null {
  const movieItem = props.movies.find((movie) => movie.id === movieId)
  if (!movieItem) {
    return null
  }

  const movie = new MovieModel()
  movie.idTMDB = movieItem.id
  movie.title = movieItem.title
  movie.overview = movieItem.overview
  movie.posterPath = movieItem.poster_path ?? movieItem.posterPath ?? ''
  movie.backdropPath = movieItem.backdrop_path ?? movieItem.backdropPath ?? ''
  movie.releaseDate = movieItem.release_date
  movie.voteAverage = movieItem.vote_average

  return movie
}

async function loadListsForAction(action: MovieActionType, movieId: number): Promise<void> {
  isLoadingActionLists.value = true
  actionListsError.value = ''
  listMembershipById.value = {}
  isPrivateListActive.value = false

  try {
    const lists = await movieUsersListsService.getListsByUserId()
    userLists.value = lists

    const [membershipPairs, privateExists] = await Promise.all([
      Promise.all(
        lists.map(async (list) => {
          const exists =
            action === 'seen'
              ? await movieUsersListsService.existsByIdTMDBIsSeen(list.id, movieId)
              : await movieUsersListsService.existsByIdTMDBIsWatched(list.id, movieId)

          return [list.id, exists] as const
        })
      ),
      action === 'seen'
        ? moviePrivateUserListService.existsByIdTMDBIsSeen(movieId)
        : moviePrivateUserListService.existsByIdTMDBIsWatched(movieId)
    ])

    listMembershipById.value = Object.fromEntries(membershipPairs)
    isPrivateListActive.value = privateExists

    if (action === 'seen') {
      if (privateExists) {
        seenMovieIds.value.add(movieId)
      } else {
        seenMovieIds.value.delete(movieId)
      }
    } else if (privateExists) {
      watchLaterMovieIds.value.add(movieId)
    } else {
      watchLaterMovieIds.value.delete(movieId)
    }
  } catch {
    actionListsError.value = 'No se pudieron cargar las listas.'
    userLists.value = []
  } finally {
    isLoadingActionLists.value = false
  }
}

async function toggleListSelection(listId: string): Promise<void> {
  if (!selectedAction.value || selectedMovieId.value === null || pendingListId.value) {
    return
  }

  const movie = buildMovieModel(selectedMovieId.value)
  if (!movie) {
    return
  }

  const isCurrentlyActive = isListActive(listId)
  pendingListId.value = listId

  try {
    if (selectedAction.value === 'seen') {
      if (isCurrentlyActive) {
        await movieUsersListsService.setMovieAsNotSeen(listId, movie)
      } else {
        await movieUsersListsService.setMovieAsIsSeen(listId, movie)
      }
    } else {
      movie.isWatched = !isCurrentlyActive
      await movieUsersListsService.setMovieIsWatchedByModel(listId, movie)
    }

    listMembershipById.value = {
      ...listMembershipById.value,
      [listId]: !isCurrentlyActive
    }

    successSnackbarMessage.value = 'Guardado correctamente'
    isSuccessSnackbarOpen.value = true
  } finally {
    pendingListId.value = null
  }
}

async function togglePrivateListSelection(): Promise<void> {
  if (!selectedAction.value || selectedMovieId.value === null || isPrivateListPending.value) {
    return
  }

  const movie = buildMovieModel(selectedMovieId.value)
  if (!movie) {
    return
  }

  isPrivateListPending.value = true
  const isCurrentlyActive = isPrivateListActive.value

  try {
    if (selectedAction.value === 'seen') {
      if (isCurrentlyActive) {
        await moviePrivateUserListService.setMovieAsNotSeen(movie.idTMDB)
        seenMovieIds.value.delete(movie.idTMDB)
      } else {
        await moviePrivateUserListService.setMovieAsIsSeenByModel(movie)
        seenMovieIds.value.add(movie.idTMDB)
      }
    } else {
      if (isCurrentlyActive) {
        await moviePrivateUserListService.setMovieAsNotWatched(movie.idTMDB)
        watchLaterMovieIds.value.delete(movie.idTMDB)
      } else {
        movie.isWatched = true
        await moviePrivateUserListService.setMovieAsIsWatchedByModel(movie)
        watchLaterMovieIds.value.add(movie.idTMDB)
      }
    }

    isPrivateListActive.value = !isCurrentlyActive
    successSnackbarMessage.value = 'Guardado correctamente'
    isSuccessSnackbarOpen.value = true
  } finally {
    isPrivateListPending.value = false
  }
}

function openActionMenu(movieId: number, action: MovieActionType): void {
  selectedMovieId.value = movieId
  selectedAction.value = action

  if (isMobileViewport.value) {
    isMobileActionDialogOpen.value = true
    closeMobileMenu(movieId)
    desktopMenuKey.value = null
    void loadListsForAction(action, movieId)
    return
  }

  const actionKey = getActionKey(movieId, action)
  desktopMenuKey.value = desktopMenuKey.value === actionKey ? null : actionKey

  if (desktopMenuKey.value) {
    void loadListsForAction(action, movieId)
  }
}

function updateViewport(): void {
  isMobileViewport.value = window.matchMedia('(max-width: 768px)').matches
  if (isMobileViewport.value) {
    desktopMenuKey.value = null
  }
}

function onDocumentClick(): void {
  desktopMenuKey.value = null
}

onMounted(() => {
  updateViewport()
  window.addEventListener('resize', updateViewport)
  document.addEventListener('click', onDocumentClick)
})

onBeforeUnmount(() => {
  flushPendingScrollPosition()
  window.removeEventListener('resize', updateViewport)
  document.removeEventListener('click', onDocumentClick)
})

watch(
  () => props.movies,
  () => {
    loadedPosterIds.value = new Set()
  },
  { immediate: true }
)
</script>

<template>
  <div
    ref="scrollerRef"
    class="movies-scroller"
    :class="{
      'is-dragging': !isGridLayout && isDragging,
      'movies-scroller--grid': isGridLayout
    }"
    @mousedown="onDragStart"
    @mousemove="onDragMove"
    @mouseup="onDragEnd"
    @mouseleave="onDragEnd"
    @dragstart.prevent
  >
    <div
      v-for="movie in props.movies"
      :key="movie.id"
      class="movie-card"
      :class="{
        'is-mobile-menu-open': isMobileMenuOpen(movie.id),
        'is-desktop-menu-open': isMovieDesktopMenuOpen(movie.id)
      }"
    >
      <RouterLink
        class="movie-poster-link"
        :to="{ name: 'detailed-movie', params: { idtmdb: movie.id } }"
        :aria-label="`Ver detalle de ${movie.title}`"
        @click="onPosterClick"
        @contextmenu="onPosterContextMenu"
      >
        <v-skeleton-loader
          v-if="getPosterUrl(movie.poster_path ?? movie.posterPath) && !isPosterLoaded(movie.id)"
          type="image"
          class="movie-poster-skeleton"
        />
        <img
          v-if="getPosterUrl(movie.poster_path ?? movie.posterPath)"
          :src="getPosterUrl(movie.poster_path ?? movie.posterPath)"
          :alt="movie.title"
          class="movie-poster"
          :class="{ 'is-loaded': isPosterLoaded(movie.id) }"
          loading="lazy"
          @load="markPosterAsLoaded(movie.id)"
          @error="markPosterAsLoaded(movie.id)"
        />
        <div v-else class="movie-poster movie-poster--fallback">
          <v-icon icon="mdi-image-off-outline" size="26" />
        </div>
      </RouterLink>

      <div class="movie-base-info">
        <h3 class="movie-title">{{ movie.title }}</h3>
        <p class="movie-meta">{{ formatYear(movie.release_date) }}</p>
      </div>

      <div class="movie-hover-info">
        <p class="movie-hover-rating">⭐ {{ formatRating(movie.vote_average) }}</p>
        <p class="movie-overview">{{ movie.overview }}</p>
        <div class="movie-actions">
          <div class="movie-action-wrapper" :class="{ 'is-open': isDesktopMenuOpen(movie.id, 'seen') }">
            <button
              class="movie-action movie-action--seen"
              :class="{ 'is-active': isSeen(movie.id) }"
              type="button"
              aria-label="Marcar como vista"
              @pointerdown.stop
              @click.stop="openActionMenu(movie.id, 'seen')"
            >
              <v-icon :icon="isSeen(movie.id) ? 'mdi-check-circle' : 'mdi-check-circle-outline'" size="20" />
            </button>
            <div v-if="isDesktopMenuOpen(movie.id, 'seen')" class="movie-test-menu" @click.stop>
              <div v-if="isLoadingActionLists" class="movie-menu-state">Cargando...</div>
              <div v-else-if="actionListsError" class="movie-menu-state">{{ actionListsError }}</div>
              <div v-else>
                <p class="movie-dialog-section-title">En mis películas (userprivatelist)</p>
                <button
                  class="movie-dialog-list-item movie-dialog-list-item--private"
                  :class="{ 'is-active': isPrivateListActive }"
                  type="button"
                  :disabled="isPrivateListPending"
                  @pointerdown.stop
                  @click.stop="togglePrivateListSelection()"
                >
                  <v-icon v-if="isPrivateListActive" icon="mdi-check" size="14" class="movie-menu-item__check" />
                  Lista privada
                </button>

                <p class="movie-dialog-section-title">En mis listas</p>
                <div v-if="!userLists.length" class="movie-menu-state">Sin listas</div>
                <div v-else class="movie-dialog-list">
                  <button
                    v-for="list in userLists"
                    :key="list.id"
                    class="movie-dialog-list-item"
                    :class="{ 'is-active': isListActive(list.id) }"
                    type="button"
                    :disabled="pendingListId === list.id"
                    @pointerdown.stop
                    @click.stop="toggleListSelection(list.id)"
                  >
                    <v-icon v-if="isListActive(list.id)" icon="mdi-check" size="14" class="movie-menu-item__check" />
                    {{ list.name }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="movie-action-wrapper" :class="{ 'is-open': isDesktopMenuOpen(movie.id, 'watch') }">
            <button
              class="movie-action movie-action--watch"
              :class="{ 'is-active': isWatchLater(movie.id) }"
              type="button"
              aria-label="Añadir a quiero ver"
              @pointerdown.stop
              @click.stop="openActionMenu(movie.id, 'watch')"
            >
              <v-icon :icon="isWatchLater(movie.id) ? 'mdi-bookmark' : 'mdi-bookmark-plus-outline'" size="20" />
            </button>
            <div v-if="isDesktopMenuOpen(movie.id, 'watch')" class="movie-test-menu" @click.stop>
              <div v-if="isLoadingActionLists" class="movie-menu-state">Cargando...</div>
              <div v-else-if="actionListsError" class="movie-menu-state">{{ actionListsError }}</div>
              <div v-else>
                <p class="movie-dialog-section-title">En mis películas</p>
                <button
                  class="movie-dialog-list-item movie-dialog-list-item--private"
                  :class="{ 'is-active': isPrivateListActive }"
                  type="button"
                  :disabled="isPrivateListPending"
                  @pointerdown.stop
                  @click.stop="togglePrivateListSelection()"
                >
                  <v-icon v-if="isPrivateListActive" icon="mdi-check" size="14" class="movie-menu-item__check" />
                  Lista privada
                </button>

                <p class="movie-dialog-section-title">En mis listas </p>
                <div v-if="!userLists.length" class="movie-menu-state">Sin listas</div>
                <div v-else class="movie-dialog-list">
                  <button
                    v-for="list in userLists"
                    :key="list.id"
                    class="movie-dialog-list-item"
                    :class="{ 'is-active': isListActive(list.id) }"
                    type="button"
                    :disabled="pendingListId === list.id"
                    @pointerdown.stop
                    @click.stop="toggleListSelection(list.id)"
                  >
                    <v-icon v-if="isListActive(list.id)" icon="mdi-check" size="14" class="movie-menu-item__check" />
                    {{ list.name }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <button
        class="movie-mobile-menu-toggle"
        type="button"
        aria-label="Abrir menú"
        :aria-expanded="isMobileMenuOpen(movie.id)"
        @pointerdown.stop
        @click.stop="toggleMobileMenu(movie.id)"
      >
        <v-icon :icon="isMobileMenuOpen(movie.id) ? 'mdi-close' : 'mdi-dots-vertical'" size="18" />
      </button>
    </div>
  </div>

  <v-dialog v-model="isMobileActionDialogOpen" max-width="320">
    <v-card class="movie-test-dialog">
      <v-card-text>
        <div v-if="isLoadingActionLists" class="movie-menu-state">Cargando...</div>
        <div v-else-if="actionListsError" class="movie-menu-state">{{ actionListsError }}</div>
        <div v-else>
          <p class="movie-dialog-section-title">En mis películas (userprivatelist)</p>
          <button
            class="movie-dialog-list-item movie-dialog-list-item--private"
            :class="{ 'is-active': isPrivateListActive }"
            type="button"
            :disabled="isPrivateListPending"
            @click="togglePrivateListSelection()"
          >
            <v-icon v-if="isPrivateListActive" icon="mdi-check" size="14" class="movie-menu-item__check" />
            Lista privada
          </button>

          <p class="movie-dialog-section-title">En mis listas </p>
          <div v-if="!userLists.length" class="movie-menu-state">Sin listas</div>
          <div v-else class="movie-dialog-list">
            <button
              v-for="list in userLists"
              :key="list.id"
              class="movie-dialog-list-item"
              :class="{ 'is-active': isListActive(list.id) }"
              type="button"
              :disabled="pendingListId === list.id"
              @click="toggleListSelection(list.id)"
            >
              <v-icon v-if="isListActive(list.id)" icon="mdi-check" size="14" class="movie-menu-item__check" />
              {{ list.name }}
            </button>
          </div>
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="isMobileActionDialogOpen = false">Cerrar</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-snackbar v-model="isSuccessSnackbarOpen" color="success" timeout="1800">
    {{ successSnackbarMessage }}
  </v-snackbar>
</template>

<style scoped>
.movies-scroller {
  margin-top: 1rem;
  display: flex;
  gap: 0.95rem;
  overflow-x: auto;
  overflow-y: hidden;
  cursor: grab;
  user-select: none;
  touch-action: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-x: contain;
  scroll-behavior: smooth;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.movies-scroller::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}

.movies-scroller.is-dragging {
  cursor: grabbing;
}

.movies-scroller--grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(11.5rem, 1fr));
  overflow: visible;
  cursor: default;
  user-select: auto;
  touch-action: manipulation;
}

.movies-scroller--grid .movie-card {
  flex: initial;
  min-width: 0;
}

.movie-card {
  position: relative;
  flex: 0 0 clamp(11.5rem, 18vw, 14rem);
  overflow: hidden;
  border-radius: 0.9rem;
  background: #091321;
  transition: transform 0.25s ease;
}

.movie-card.is-desktop-menu-open {
  overflow: visible;
  z-index: 9;
}

.movie-card:hover {
  transform: translateY(-5px);
}

.movie-poster {
  position: relative;
  z-index: 1;
  width: 100%;
  aspect-ratio: 2 / 3;
  object-fit: cover;
  display: block;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.movie-poster.is-loaded {
  opacity: 1;
}

.movie-poster--fallback {
  display: grid;
  place-items: center;
  background: linear-gradient(160deg, #0c1b31, #081425);
  color: #b6cbe8;
  opacity: 1;
}

.movie-poster-link {
  position: relative;
  display: block;
  -webkit-touch-callout: none;
}

.movie-poster-skeleton {
  position: absolute;
  inset: 0;
  z-index: 0;
}

.movie-base-info {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1;
  padding: 0.75rem 0.7rem;
  background: linear-gradient(to top, rgba(0, 8, 18, 0.96), rgba(0, 8, 18, 0.62), transparent);
}

.movie-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1.35;
  color: #f6fbff;
}

.movie-meta {
  margin: 0.22rem 0 0;
  font-size: 0.78rem;
  color: #cdd9ea;
}

.movie-hover-info {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 0.45rem;
  padding: 0.7rem;
  background: linear-gradient(to top, rgba(2, 10, 22, 0.98), rgba(2, 10, 22, 0.84), rgba(2, 10, 22, 0.2));
  opacity: 0;
  transform: translateY(8px);
  transition: opacity 0.22s ease, transform 0.22s ease;
  pointer-events: none;
}

.movie-actions,
.movie-action-wrapper,
.movie-test-menu,
.movie-action {
  pointer-events: auto;
}

.movie-card:hover .movie-hover-info,
.movie-card:focus-within .movie-hover-info {
  opacity: 1;
  transform: translateY(0);
}

.movie-card.is-desktop-menu-open .movie-hover-info {
  opacity: 1;
  transform: translateY(0);
}

.movie-hover-rating {
  margin: 0;
  font-size: 0.8rem;
  font-weight: 600;
  color: #d9e7fb;
}

.movie-overview {
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

.movie-actions {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin-left: auto;
}

.movie-action-wrapper {
  position: relative;
  display: inline-flex;
}

.movie-action-wrapper.is-open {
  z-index: 7;
}

.movie-test-menu {
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

.movie-menu-state {
  padding: 0.3rem 0.4rem;
  color: #d9e7fb;
}

.movie-dialog-section-title {
  margin: 0.35rem 0.4rem 0.25rem;
  font-size: 0.68rem;
  color: #aac2e2;
}

.movie-dialog-section-title + .movie-dialog-list-item {
  margin-bottom: 0.3rem;
}

.movie-menu-item,
.movie-dialog-list-item {
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

.movie-menu-item.is-active,
.movie-dialog-list-item.is-active {
  background: rgba(34, 197, 94, 0.26);
}

.movie-dialog-list-item--private.is-active {
  background: rgba(59, 130, 246, 0.28);
}

.movie-menu-item__check {
  color: #22c55e;
}

.movie-dialog-list-item--private .movie-menu-item__check {
  color: #3b82f6;
}

.movie-menu-item:hover,
.movie-dialog-list-item:hover {
  background: rgba(38, 63, 102, 0.4);
}

.movie-dialog-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.movie-action {
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

.movie-action:hover {
  transform: translateY(-1px);
  filter: brightness(1.06);
}

.movie-mobile-menu-toggle {
  display: none;
}

.movie-action--seen {
  background: #1d9f5a;
}

.movie-action--seen.is-active {
  background: #22c55e;
}

.movie-action--watch {
  background: #2563eb;
}

.movie-action--watch.is-active {
  background: #3b82f6;
}

@media (max-width: 768px) {
  .movies-scroller--grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.8rem;
  }

  .movie-card {
    flex-basis: 10.8rem;
  }

  .movie-card:hover {
    transform: none;
  }

  .movie-hover-info {
    opacity: 0;
    transform: translateY(8px);
    pointer-events: none;
    gap: 0.6rem;
  }

  .movie-card:hover .movie-hover-info,
  .movie-card:focus-within .movie-hover-info {
    opacity: 0;
    transform: translateY(8px);
  }

  .movie-card.is-mobile-menu-open .movie-hover-info {
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
  }

  .movie-hover-rating,
  .movie-overview,
  .movie-actions {
    transform: translateY(12px);
    opacity: 0;
    transition: transform 0.22s ease, opacity 0.22s ease;
  }

  .movie-card.is-mobile-menu-open .movie-hover-rating,
  .movie-card.is-mobile-menu-open .movie-overview,
  .movie-card.is-mobile-menu-open .movie-actions {
    transform: translateY(0);
    opacity: 1;
  }

  .movie-hover-rating {
    font-size: 0.75rem;
  }

  .movie-actions {
    order: -1;
    align-self: flex-end;
    border-radius: 999px;
    padding: 0.2rem;
    background: rgba(4, 14, 30, 0.9);
  }

  .movie-action:hover {
    transform: none;
    filter: none;
  }

  .movie-mobile-menu-toggle {
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

  .movie-card.is-mobile-menu-open .movie-mobile-menu-toggle {
    background: rgba(21, 39, 66, 0.96);
  }
}
</style>
