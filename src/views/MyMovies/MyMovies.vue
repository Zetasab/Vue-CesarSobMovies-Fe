<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MyMoviesScroller from '../../components/MyMoviesScroller.vue'
import { watchedMoviesService } from '../../services/watchedMoviesService'
import { wishlistMoviesService } from '../../services/wishlistMoviesService'

type PrivateMovieApiItem = {
  _id?: string
  id?: number
  Title?: string
  IdTMDB?: number
  Id_TMDB?: number | string
  id_tmdb?: number | string
  idTMDB?: number | string
  idTmdb?: number | string
  OriginalTitle?: string
  Overview?: string
  PosterPath?: string
  BackdropPath?: string
  ReleaseDate?: string
  VoteAverage?: number
  VoteCount?: number
  Adult?: boolean
  OriginalLanguage?: string
  Popularity?: number
  IsLiked?: boolean
  IsWatched?: boolean
  IsSeen?: boolean
}

type MoviesCollectionFilter = 'wishlist' | 'watched'

const titleFilter = ref('')
const selectedCollection = ref<MoviesCollectionFilter>('wishlist')
const allMovies = ref<PrivateMovieApiItem[]>([])
const movies = ref<PrivateMovieApiItem[]>([])
const isLoading = ref(false)
const errorMessage = ref('')
const isSyncingAfterMutation = ref(false)
const currentPage = ref(1)

const route = useRoute()
const router = useRouter()

const COLLECTION_FILTER_STORAGE_KEY = 'my-movies-collection-filter'
const PAGE_QUERY_KEY = 'page'
const DATA_PER_PAGE = 50

const filteredMovies = computed(() => {
  const normalizedFilter = titleFilter.value.trim().toLowerCase()
  if (!normalizedFilter) {
    return allMovies.value
  }

  return allMovies.value.filter((movie) => (movie.Title ?? '').toLowerCase().includes(normalizedFilter))
})

const paginationLength = computed(() => Math.max(1, Math.ceil(filteredMovies.value.length / DATA_PER_PAGE)))
const shouldShowPagination = computed(() => paginationLength.value > 1)
const selectedCollectionLabel = computed(() => (selectedCollection.value === 'wishlist' ? 'wishlist' : 'watched'))

function parseRoutePage(value: unknown): number {
  const routeValue = Array.isArray(value) ? value[0] : value
  const parsedPage = Number(routeValue)

  return Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1
}

async function syncPageToRoute(page: number): Promise<void> {
  const nextPage = Number.isInteger(page) && page > 1 ? page : 1
  const nextQuery = { ...route.query }

  if (nextPage === 1) {
    delete nextQuery[PAGE_QUERY_KEY]
  } else {
    nextQuery[PAGE_QUERY_KEY] = String(nextPage)
  }

  await router.replace({ query: nextQuery })
}

function loadCollectionFilterFromStorage(): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const storedFilter = window.localStorage.getItem(COLLECTION_FILTER_STORAGE_KEY)
    if (storedFilter === 'wishlist' || storedFilter === 'watched') {
      selectedCollection.value = storedFilter
    }
  } catch {
    window.localStorage.removeItem(COLLECTION_FILTER_STORAGE_KEY)
  }
}

function saveCollectionFilterToStorage(): void {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(COLLECTION_FILTER_STORAGE_KEY, selectedCollection.value)
}

type ApiMovieShape = Record<string, unknown>

function readStringValue(source: ApiMovieShape, keys: string[]): string {
  for (const key of keys) {
    const rawValue = source[key]
    if (typeof rawValue === 'string') {
      return rawValue
    }
  }

  return ''
}

function readNumberValue(source: ApiMovieShape, keys: string[], fallback = 0): number {
  for (const key of keys) {
    const rawValue = source[key]
    const parsedValue = Number(rawValue)
    if (Number.isFinite(parsedValue)) {
      return parsedValue
    }
  }

  return fallback
}

function readBooleanValue(source: ApiMovieShape, keys: string[]): boolean {
  for (const key of keys) {
    const rawValue = source[key]
    if (typeof rawValue === 'boolean') {
      return rawValue
    }
  }

  return false
}

function mapMovieSummaryToListItem(rawMovie: unknown, source: MoviesCollectionFilter): PrivateMovieApiItem {
  const movie = (rawMovie as ApiMovieShape | null) ?? {}
  const movieId = readNumberValue(movie, ['id', 'Id', 'movieId', 'MovieId'])

  return {
    id: movieId,
    Title: readStringValue(movie, ['title', 'Title']),
    IdTMDB: movieId,
    OriginalTitle: readStringValue(movie, ['original_title', 'originalTitle', 'OriginalTitle']),
    Overview: readStringValue(movie, ['overview', 'Overview']),
    PosterPath: readStringValue(movie, ['poster_path', 'posterPath', 'PosterPath']),
    BackdropPath: readStringValue(movie, ['backdrop_path', 'backdropPath', 'BackdropPath']),
    ReleaseDate: readStringValue(movie, ['release_date', 'releaseDate', 'ReleaseDate']),
    VoteAverage: readNumberValue(movie, ['vote_average', 'voteAverage', 'VoteAverage']),
    VoteCount: readNumberValue(movie, ['vote_count', 'voteCount', 'VoteCount']),
    Adult: readBooleanValue(movie, ['adult', 'Adult']),
    OriginalLanguage: readStringValue(movie, ['original_language', 'originalLanguage', 'OriginalLanguage']),
    Popularity: readNumberValue(movie, ['popularity', 'Popularity']),
    IsWatched: source === 'wishlist',
    IsSeen: source === 'watched'
  }
}

function updateDisplayedMovies(): void {
  const startIndex = (currentPage.value - 1) * DATA_PER_PAGE
  const endIndex = startIndex + DATA_PER_PAGE
  movies.value = filteredMovies.value.slice(startIndex, endIndex)
}

async function loadMyMovies(): Promise<void> {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const source = selectedCollection.value
    const response = source === 'wishlist'
      ? await wishlistMoviesService.getAllByUserId()
      : await watchedMoviesService.getAllByUserId()

    allMovies.value = (response as unknown[]).map((movie) => mapMovieSummaryToListItem(movie, source))

    if (currentPage.value > paginationLength.value) {
      await syncPageToRoute(paginationLength.value)
      return
    }

    updateDisplayedMovies()
  } catch {
    allMovies.value = []
    movies.value = []
    errorMessage.value = 'No se pudieron cargar tus películas.'
  } finally {
    isLoading.value = false
  }
}

async function setPage(page: number): Promise<void> {
  const safePage = Number.isInteger(page) && page > 0 ? page : 1
  if (safePage === currentPage.value) {
    return
  }

  await syncPageToRoute(safePage)
}

function onPaginationChange(page: number): void {
  void setPage(page)
}

async function syncMoviesAfterMutation(): Promise<void> {
  if (isSyncingAfterMutation.value) {
    return
  }

  isSyncingAfterMutation.value = true

  try {
    await loadMyMovies()
  } finally {
    isSyncingAfterMutation.value = false
  }
}

async function applyFilters(): Promise<void> {
  if (currentPage.value !== 1) {
    await syncPageToRoute(1)
    return
  }

  updateDisplayedMovies()
}

function resetFilters(): void {
  titleFilter.value = ''
  void applyFilters()
}

watch(selectedCollection, async () => {
  saveCollectionFilterToStorage()

  if (currentPage.value !== 1) {
    await syncPageToRoute(1)
    return
  }

  await loadMyMovies()
})

loadCollectionFilterFromStorage()

watch(
  () => route.query[PAGE_QUERY_KEY],
  (routePage) => {
    currentPage.value = parseRoutePage(routePage)

    if (currentPage.value > paginationLength.value) {
      void syncPageToRoute(paginationLength.value)
      return
    }

    if (!allMovies.value.length) {
      void loadMyMovies()
      return
    }

    updateDisplayedMovies()
  },
  { immediate: true }
)
</script>

<template>
  <main class="my-movies-page">
    <section class="my-movies-header">
      <h1 class="my-movies-title">Mis películas</h1>
    </section>

    <section class="my-movies-filters">
      <v-text-field
        v-model="titleFilter"
        label="Título"
        placeholder="Buscar por nombre"
        variant="outlined"
        hide-details
        density="comfortable"
        clearable
        prepend-inner-icon="mdi-magnify"
        class="my-movies-title-filter"
        @keyup.enter="applyFilters"
      />

      <div class="my-movies-toggles">
        <v-btn-toggle
          v-model="selectedCollection"
          mandatory
          color="primary"
          density="comfortable"
          variant="outlined"
        >
          <v-btn value="wishlist" :class="{ 'toggle-watched-active': selectedCollection === 'wishlist' }">
            Wishlist
          </v-btn>
          <v-btn value="watched" :class="{ 'toggle-seen-active': selectedCollection === 'watched' }">
            Watched
          </v-btn>
        </v-btn-toggle>
      </div>

      <div class="my-movies-actions">
        <v-btn color="primary" :loading="isLoading" @click="applyFilters">Aplicar filtros</v-btn>
        <v-btn variant="tonal" :disabled="isLoading" @click="resetFilters">Limpiar</v-btn>
      </div>
    </section>

    <section class="my-movies-content">
      <v-alert v-if="errorMessage" type="error" variant="tonal" density="comfortable">
        {{ errorMessage }}
      </v-alert>

      <v-progress-linear v-else-if="isLoading" indeterminate color="primary" />

      <v-alert v-else-if="!movies.length" type="info" variant="tonal" density="comfortable">
        No se encontraron películas en {{ selectedCollectionLabel }} con esos filtros.
      </v-alert>

      <MyMoviesScroller v-else :movies="movies" @refresh-needed="syncMoviesAfterMutation" />

      <div v-if="!errorMessage && shouldShowPagination" class="my-movies-pagination">
        <v-pagination
          :model-value="currentPage"
          :length="paginationLength"
          :total-visible="5"
          density="comfortable"
          @update:model-value="onPaginationChange"
        />
      </div>
    </section>
  </main>
</template>

<style scoped src="./MyMovies.css"></style>
