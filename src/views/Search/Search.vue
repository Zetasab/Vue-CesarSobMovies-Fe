<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MoviesScroller from '../../components/MoviesScroller.vue'
import { authService } from '../../services/authService'
import { tmdbApiService } from '../../services/tmdbApiService'

type TmdbSearchMovieItem = {
  id: number
  title: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  release_date: string
  vote_average: number
}

type TmdbSearchResponse = {
  page: number
  total_pages: number
  results: TmdbSearchMovieItem[]
}

type ScrollerMovieItem = {
  id: number
  title: string
  overview: string
  poster_path: string
  backdrop_path: string
  release_date: string
  vote_average: number
}

type MovieListFilter = 'now_playing' | 'popular' | 'top_rated' | 'upcoming'

type MovieListOption = {
  label: string
  value: MovieListFilter
}

const query = ref('')
const selectedList = ref<MovieListFilter>('popular')
const currentPage = ref(1)
const totalPages = ref(1)
const movies = ref<ScrollerMovieItem[]>([])
const isLoading = ref(false)
const errorMessage = ref('')
const route = useRoute()
const router = useRouter()

const QUERY_PARAM_KEY = 'q'
const PAGE_PARAM_KEY = 'page'
const LIST_PARAM_KEY = 'list'

const movieListOptions: MovieListOption[] = [
  { label: 'Now Playing', value: 'now_playing' },
  { label: 'Popular', value: 'popular' },
  { label: 'Top Rated', value: 'top_rated' },
  { label: 'Upcoming', value: 'upcoming' }
]


const skeletonCardCount = 8

function normalizeMovie(item: TmdbSearchMovieItem): ScrollerMovieItem {
  return {
    id: item.id,
    title: item.title,
    overview: item.overview,
    poster_path: item.poster_path ?? '',
    backdrop_path: item.backdrop_path ?? '',
    release_date: item.release_date,
    vote_average: item.vote_average
  }
}

function parseRouteText(value: unknown): string {
  const rawValue = Array.isArray(value) ? value[0] : value
  return String(rawValue ?? '').trim()
}

function parseRoutePage(value: unknown): number {
  const rawValue = Array.isArray(value) ? value[0] : value
  const parsed = Number(rawValue)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1
}

function parseRouteList(value: unknown): MovieListFilter {
  const rawValue = Array.isArray(value) ? value[0] : value
  const parsed = String(rawValue ?? '').trim() as MovieListFilter

  if (movieListOptions.some((item) => item.value === parsed)) {
    return parsed
  }

  return 'popular'
}

async function updateRouteQuery(text: string, page: number, list: MovieListFilter): Promise<boolean> {
  const normalizedText = text.trim()
  const normalizedPage = Number.isInteger(page) && page > 0 ? page : 1
  const normalizedList = parseRouteList(list)
  const currentText = parseRouteText(route.query[QUERY_PARAM_KEY])
  const currentPageFromRoute = parseRoutePage(route.query[PAGE_PARAM_KEY])
  const currentListFromRoute = parseRouteList(route.query[LIST_PARAM_KEY])

  if (
    normalizedText === currentText
    && normalizedPage === currentPageFromRoute
    && normalizedList === currentListFromRoute
  ) {
    return false
  }

  const nextQuery = { ...route.query }

  if (normalizedText) {
    nextQuery[QUERY_PARAM_KEY] = normalizedText
  } else {
    delete nextQuery[QUERY_PARAM_KEY]
  }

  if (normalizedPage > 1) {
    nextQuery[PAGE_PARAM_KEY] = String(normalizedPage)
  } else {
    delete nextQuery[PAGE_PARAM_KEY]
  }

  nextQuery[LIST_PARAM_KEY] = normalizedList

  await router.replace({ query: nextQuery })
  return true
}

async function searchMovies(text: string, page = 1, list: MovieListFilter = 'popular'): Promise<void> {
  const normalizedText = text.trim()
  const normalizedPage = Number.isInteger(page) && page > 0 ? page : 1
  const normalizedList = parseRouteList(list)

  const isValidLogin = await authService.checkLogin()
  if (!isValidLogin) {
    await router.replace({ name: 'login' })
    return
  }


  isLoading.value = true
  errorMessage.value = ''

  try {
    const response = normalizedText
      ? await tmdbApiService.get<TmdbSearchResponse>('search/movie', {
          query: normalizedText,
          language: 'es-ES',
          include_adult: false,
          page: normalizedPage
        })
      : await tmdbApiService.get<TmdbSearchResponse>(normalizedList, {
          language: 'es-ES',
          page: normalizedPage
        })

        console.log("asd")
    console.log(tmdbApiService);

    movies.value = response.results.map(normalizeMovie)
    currentPage.value = response.page
    totalPages.value = Math.max(1, Math.min(response.total_pages, 500))
  } catch {
    movies.value = []
    totalPages.value = 1
    currentPage.value = 1
    errorMessage.value = 'No se pudieron cargar resultados desde TMDB.'
  } finally {
    isLoading.value = false
  }
}

async function onSearchClick(): Promise<void> {
  const text = query.value.trim()
  const didChangeRoute = await updateRouteQuery(text, 1, selectedList.value)

  if (!didChangeRoute) {
    await searchMovies(text, 1, selectedList.value)
  }
}

function onPageChange(page: number): void {
  void updateRouteQuery(query.value.trim(), page, selectedList.value)
}

function onListChange(): void {
  void updateRouteQuery(query.value.trim(), 1, selectedList.value)
}

watch(
  () => [route.query[QUERY_PARAM_KEY], route.query[PAGE_PARAM_KEY], route.query[LIST_PARAM_KEY]],
  ([routeText, routePage, routeList]) => {
    const parsedText = parseRouteText(routeText)
    const parsedPage = parseRoutePage(routePage)
    const parsedList = parseRouteList(routeList)

    query.value = parsedText
    selectedList.value = parsedList
    void searchMovies(parsedText, parsedPage, parsedList)
  },
  { immediate: true }
)
</script>

<template>
  <main class="search-page">
    <section class="search-header">
      <h1 class="search-title">Buscar películas</h1>
      <p class="search-subtitle">Busca por nombre o por listas de TMDB.</p>
    </section>

    <section class="search-form">
      <v-text-field
        v-model="query"
        label="Nombre de película"
        placeholder="Ej: Interstellar"
        variant="outlined"
        density="comfortable"
        hide-details
        clearable
        prepend-inner-icon="mdi-magnify"
        @keyup.enter="onSearchClick"
      />

      <v-select
        v-model="selectedList"
        :items="movieListOptions"
        item-title="label"
        item-value="value"
        label="Movie lists"
        variant="outlined"
        density="comfortable"
        hide-details
        @update:model-value="onListChange"
      />

      <v-btn color="primary" :loading="isLoading" @click="onSearchClick">Buscar</v-btn>
    </section>

   
    <section class="search-results">
      <p v-if="!isLoading && !errorMessage" class="search-results-summary">
        {{ movies.length }} resultado(s) · Página {{ currentPage }} de {{ totalPages }}
      </p>

      <v-alert v-if="errorMessage" type="error" variant="tonal" density="comfortable">
        {{ errorMessage }}
      </v-alert>

      <div v-else-if="isLoading" class="search-results-list" aria-label="Resultados cargando">
        <article
          v-for="index in skeletonCardCount"
          :key="`skeleton-${index}`"
          class="search-result-item search-result-item--skeleton"
          aria-hidden="true"
        >
          <v-skeleton-loader class="search-result-poster-skeleton" type="image" />
          <div class="search-result-content search-result-content--skeleton">
            <v-skeleton-loader type="heading" />
            <v-skeleton-loader type="text" />
            <v-skeleton-loader type="paragraph" />
          </div>
        </article>
      </div>

      <v-alert v-else-if="!movies.length" type="info" variant="tonal" density="comfortable">
        {{ query.trim() ? 'No se encontraron películas para esa búsqueda.' : 'No se encontraron resultados para la lista seleccionada.' }}
      </v-alert>

      <template v-else>
        <MoviesScroller :movies="movies" layout="grid" />

        <div v-if="totalPages > 1" class="search-pagination">
          <v-pagination
            :model-value="currentPage"
            :length="totalPages"
            :total-visible="7"
            density="comfortable"
            @update:model-value="onPageChange"
          />
        </div>
      </template>
    </section>
  </main>
</template>

<style scoped src="./Search.css"></style>