<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { MovieModel } from '../models/MovieModel'
import { MovieUsersListsModel } from '../models/MovieUsersListsModel'
import { moviePrivateUserListService } from '../services/moviePrivateUserListService'
import { movieUsersListsService } from '../services/movieUsersListsService'

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
  const movieItem = props.movies.find((movie) => getMovieId(movie) === movieId)
  if (!movieItem) {
    return null
  }

  const movie = new MovieModel()
  movie.idTMDB = movieId
  movie.title = getMovieTitle(movieItem)
  movie.originalTitle = movieItem.OriginalTitle ?? getMovieTitle(movieItem)
  movie.overview = getMovieOverview(movieItem)
  movie.posterPath = getPosterPath(movieItem)
  movie.backdropPath = movieItem.BackdropPath ?? movieItem.backdropPath ?? ''
  movie.releaseDate = getReleaseDate(movieItem)
  movie.voteAverage = getVoteAverage(movieItem)

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
    emit('refresh-needed')
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
    emit('refresh-needed')
  } finally {
    isPrivateListPending.value = false
  }
}

function openActionMenu(movieId: number, action: MovieActionType): void {
  selectedMovieId.value = movieId
  selectedAction.value = action

  if (isMobileViewport.value) {
    isMobileActionDialogOpen.value = true
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
  } else {
    mobileMenuMovieId.value = null
  }
}

function onDocumentClick(): void {
  desktopMenuKey.value = null
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
  document.addEventListener('click', onDocumentClick)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateViewport)
  document.removeEventListener('click', onDocumentClick)
})
</script>

<template>
  <div class="my-movies-scroller">
    <div
      v-for="movie in props.movies"
      :key="movie._id ?? getMovieId(movie)"
      class="my-movie-card"
      :class="{
        'is-mobile-menu-open': isMobileMenuOpen(getMovieId(movie)),
        'is-desktop-menu-open': isMovieDesktopMenuOpen(getMovieId(movie))
      }"
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
        <div class="my-movie-actions">
          <div class="my-movie-action-wrapper" :class="{ 'is-open': isDesktopMenuOpen(getMovieId(movie), 'seen') }">
            <button
              class="my-movie-action my-movie-action--seen"
              :class="{ 'is-active': isSeen(movie) }"
              type="button"
              aria-label="Marcar como vista"
              @click.stop="openActionMenu(getMovieId(movie), 'seen')"
            >
              <v-icon :icon="isSeen(movie) ? 'mdi-check-circle' : 'mdi-check-circle-outline'" size="20" />
            </button>
            <div v-if="isDesktopMenuOpen(getMovieId(movie), 'seen')" class="my-movie-action-menu" @click.stop>
              <div v-if="isLoadingActionLists" class="my-movie-menu-state">Cargando...</div>
              <div v-else-if="actionListsError" class="my-movie-menu-state">{{ actionListsError }}</div>
              <div v-else>
                <p class="my-movie-dialog-section-title">En mis películas</p>
                <button
                  class="my-movie-dialog-list-item my-movie-dialog-list-item--private"
                  :class="{ 'is-active': isPrivateListActive }"
                  type="button"
                  :disabled="isPrivateListPending"
                  @click.stop="togglePrivateListSelection()"
                >
                  <v-icon v-if="isPrivateListActive" icon="mdi-check" size="14" class="my-movie-menu-item-check" />
                  Lista privada
                </button>

                <p class="my-movie-dialog-section-title">En mis listas</p>
                <div v-if="!userLists.length" class="my-movie-menu-state">Sin listas</div>
                <div v-else class="my-movie-dialog-list">
                  <button
                    v-for="list in userLists"
                    :key="list.id"
                    class="my-movie-dialog-list-item"
                    :class="{ 'is-active': isListActive(list.id) }"
                    type="button"
                    :disabled="pendingListId === list.id"
                    @click.stop="toggleListSelection(list.id)"
                  >
                    <v-icon v-if="isListActive(list.id)" icon="mdi-check" size="14" class="my-movie-menu-item-check" />
                    {{ list.name }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="my-movie-action-wrapper" :class="{ 'is-open': isDesktopMenuOpen(getMovieId(movie), 'watch') }">
            <button
              class="my-movie-action my-movie-action--watch"
              :class="{ 'is-active': isWatched(movie) }"
              type="button"
              aria-label="Añadir a quiero ver"
              @click.stop="openActionMenu(getMovieId(movie), 'watch')"
            >
              <v-icon :icon="isWatched(movie) ? 'mdi-bookmark' : 'mdi-bookmark-plus-outline'" size="20" />
            </button>
            <div v-if="isDesktopMenuOpen(getMovieId(movie), 'watch')" class="my-movie-action-menu" @click.stop>
              <div v-if="isLoadingActionLists" class="my-movie-menu-state">Cargando...</div>
              <div v-else-if="actionListsError" class="my-movie-menu-state">{{ actionListsError }}</div>
              <div v-else>
                <p class="my-movie-dialog-section-title">En mis películas</p>
                <button
                  class="my-movie-dialog-list-item my-movie-dialog-list-item--private"
                  :class="{ 'is-active': isPrivateListActive }"
                  type="button"
                  :disabled="isPrivateListPending"
                  @click.stop="togglePrivateListSelection()"
                >
                  <v-icon v-if="isPrivateListActive" icon="mdi-check" size="14" class="my-movie-menu-item-check" />
                  Lista privada
                </button>

                <p class="my-movie-dialog-section-title">En mis listas</p>
                <div v-if="!userLists.length" class="my-movie-menu-state">Sin listas</div>
                <div v-else class="my-movie-dialog-list">
                  <button
                    v-for="list in userLists"
                    :key="list.id"
                    class="my-movie-dialog-list-item"
                    :class="{ 'is-active': isListActive(list.id) }"
                    type="button"
                    :disabled="pendingListId === list.id"
                    @click.stop="toggleListSelection(list.id)"
                  >
                    <v-icon v-if="isListActive(list.id)" icon="mdi-check" size="14" class="my-movie-menu-item-check" />
                    {{ list.name }}
                  </button>
                </div>
              </div>
            </div>
          </div>
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

  <v-dialog v-model="isMobileActionDialogOpen" max-width="320">
    <v-card class="my-movie-dialog-card">
      <v-card-text>
        <div v-if="isLoadingActionLists" class="my-movie-menu-state">Cargando...</div>
        <div v-else-if="actionListsError" class="my-movie-menu-state">{{ actionListsError }}</div>
        <div v-else>
          <p class="my-movie-dialog-section-title">En mis películas</p>
          <button
            class="my-movie-dialog-list-item my-movie-dialog-list-item--private"
            :class="{ 'is-active': isPrivateListActive }"
            type="button"
            :disabled="isPrivateListPending"
            @click="togglePrivateListSelection()"
          >
            <v-icon v-if="isPrivateListActive" icon="mdi-check" size="14" class="my-movie-menu-item-check" />
            Lista privada
          </button>

          <p class="my-movie-dialog-section-title">En mis listas</p>
          <div v-if="!userLists.length" class="my-movie-menu-state">Sin listas</div>
          <div v-else class="my-movie-dialog-list">
            <button
              v-for="list in userLists"
              :key="list.id"
              class="my-movie-dialog-list-item"
              :class="{ 'is-active': isListActive(list.id) }"
              type="button"
              :disabled="pendingListId === list.id"
              @click="toggleListSelection(list.id)"
            >
              <v-icon v-if="isListActive(list.id)" icon="mdi-check" size="14" class="my-movie-menu-item-check" />
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
