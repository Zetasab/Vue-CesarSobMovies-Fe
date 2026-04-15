<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MyMoviesScroller from '../../components/MyMoviesScroller.vue'
import { MovieModel } from '../../models/MovieModel'
import { movieUsersListsService } from '../../services/movieUsersListsService'

const route = useRoute()
const router = useRouter()

const titleFilter = ref('')
const includeWatched = ref(true)
const includeSeen = ref(true)
const movies = ref<MovieModel[]>([])
const isLoading = ref(false)
const errorMessage = ref('')
const isSyncingAfterMutation = ref(false)
const currentPage = ref(1)
const hasNextPage = ref(false)

const listId = computed(() => String(route.params.listId ?? '').trim())
const listName = computed(() => {
  const rawName = route.query.name
  if (Array.isArray(rawName)) {
    return String(rawName[0] ?? '').trim()
  }

  return String(rawName ?? '').trim()
})
const pageTitle = computed(() => (listName.value ? listName.value : 'Películas de la lista'))
const hasAnyStatusFilter = computed(() => includeWatched.value || includeSeen.value)
const STATUS_FILTERS_STORAGE_KEY = 'movies-by-list-status-filters'
const selectedStatuses = computed<string[]>({
  get() {
    const values: string[] = []

    if (includeSeen.value) {
      values.push('seen')
    }

    if (includeWatched.value) {
      values.push('watched')
    }

    return values
  },
  set(values: string[]) {
    includeSeen.value = values.includes('seen')
    includeWatched.value = values.includes('watched')
  }
})

const PAGE_QUERY_KEY = 'page'
const DATA_PER_PAGE = 50
const paginationLength = computed(() => Math.max(currentPage.value, currentPage.value + (hasNextPage.value ? 1 : 0)))
const shouldShowPagination = computed(() => currentPage.value > 1 || movies.value.length >= DATA_PER_PAGE)

function loadStatusFiltersFromStorage(): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const rawFilters = window.localStorage.getItem(STATUS_FILTERS_STORAGE_KEY)
    if (!rawFilters) {
      return
    }

    const parsed = JSON.parse(rawFilters) as { includeSeen?: unknown; includeWatched?: unknown }

    if (typeof parsed.includeSeen === 'boolean') {
      includeSeen.value = parsed.includeSeen
    }

    if (typeof parsed.includeWatched === 'boolean') {
      includeWatched.value = parsed.includeWatched
    }
  } catch {
    window.localStorage.removeItem(STATUS_FILTERS_STORAGE_KEY)
  }
}

function saveStatusFiltersToStorage(): void {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(
    STATUS_FILTERS_STORAGE_KEY,
    JSON.stringify({
      includeSeen: includeSeen.value,
      includeWatched: includeWatched.value
    })
  )
}

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

async function loadMoviesByList(): Promise<void> {
  if (!listId.value) {
    movies.value = []
    hasNextPage.value = false
    errorMessage.value = 'Lista inválida.'
    return
  }

  if (!hasAnyStatusFilter.value) {
    movies.value = []
    hasNextPage.value = false
    errorMessage.value = ''
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    const response = await movieUsersListsService.getMyUsersListMovies(listId.value, {
      title: titleFilter.value.trim(),
      isWatched: includeWatched.value ? true : null,
      isSeen: includeSeen.value ? true : null,
      page: currentPage.value,
      dataPerPage: DATA_PER_PAGE
    })

    if (!response.length && currentPage.value > 1) {
      await syncPageToRoute(currentPage.value - 1)
      return
    }

    movies.value = response
    hasNextPage.value = response.length === DATA_PER_PAGE
  } catch {
    movies.value = []
    hasNextPage.value = false
    errorMessage.value = 'No se pudieron cargar las películas de la lista.'
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

  if (!hasAnyStatusFilter.value) {
    movies.value = []
    hasNextPage.value = false
    return
  }

  isSyncingAfterMutation.value = true

  try {
    const response = await movieUsersListsService.getMyUsersListMovies(listId.value, {
      title: titleFilter.value.trim(),
      isWatched: includeWatched.value ? true : null,
      isSeen: includeSeen.value ? true : null,
      page: currentPage.value,
      dataPerPage: DATA_PER_PAGE
    })

    if (!response.length && currentPage.value > 1) {
      await syncPageToRoute(currentPage.value - 1)
      return
    }

    movies.value = response
    hasNextPage.value = response.length === DATA_PER_PAGE
  } finally {
    isSyncingAfterMutation.value = false
  }
}

async function applyFilters(): Promise<void> {
  if (currentPage.value !== 1) {
    await syncPageToRoute(1)
    return
  }

  await loadMoviesByList()
}

function resetFilters(): void {
  titleFilter.value = ''
  includeWatched.value = true
  includeSeen.value = true
  void applyFilters()
}

watch([includeSeen, includeWatched], () => {
  saveStatusFiltersToStorage()
})

loadStatusFiltersFromStorage()

watch(
  () => [route.params.listId, route.query[PAGE_QUERY_KEY]],
  () => {
    currentPage.value = parseRoutePage(route.query[PAGE_QUERY_KEY])
    void loadMoviesByList()
  },
  { immediate: true }
)
</script>

<template>
  <main class="movies-by-list-page">
    <section class="movies-by-list-header">
      <div class="movies-by-list-header-top">
        <v-btn variant="text" prepend-icon="mdi-arrow-left" @click="router.push('/mis-listas')">Volver</v-btn>
      </div>
      <h1 class="movies-by-list-title">{{ pageTitle }}</h1>
    </section>

    <section class="movies-by-list-filters">
      <v-text-field
        v-model="titleFilter"
        label="Título"
        placeholder="Buscar por nombre"
        variant="outlined"
        hide-details
        density="comfortable"
        clearable
        prepend-inner-icon="mdi-magnify"
        class="movies-by-list-title-filter"
        @keyup.enter="loadMoviesByList"
      />

      <div class="movies-by-list-toggles">
        <v-btn-toggle v-model="selectedStatuses" multiple color="primary" density="comfortable" variant="outlined">
          <v-btn value="seen" :class="{ 'toggle-seen-active': includeSeen }">
            <v-icon v-if="includeSeen" icon="mdi-check" size="16" class="toggle-check-icon" />
            Vistas
          </v-btn>
          <v-btn value="watched" :class="{ 'toggle-watched-active': includeWatched }">
            <v-icon v-if="includeWatched" icon="mdi-check" size="16" class="toggle-check-icon" />
            Por ver
          </v-btn>
        </v-btn-toggle>
      </div>

      <div class="movies-by-list-actions">
        <v-btn color="primary" :loading="isLoading" @click="applyFilters">Aplicar filtros</v-btn>
        <v-btn variant="tonal" :disabled="isLoading" @click="resetFilters">Limpiar</v-btn>
      </div>
    </section>

    <section class="movies-by-list-content">
      <v-alert v-if="errorMessage" type="error" variant="tonal" density="comfortable">
        {{ errorMessage }}
      </v-alert>

      <v-progress-linear v-else-if="isLoading" indeterminate color="primary" />

      <v-alert v-else-if="!hasAnyStatusFilter" type="info" variant="tonal" density="comfortable">
        Activa al menos un estado para ver resultados.
      </v-alert>

      <v-alert v-else-if="!movies.length" type="info" variant="tonal" density="comfortable">
        No se encontraron películas en esta lista.
      </v-alert>

      <MyMoviesScroller v-else :movies="movies as unknown as Record<string, unknown>[]" @refresh-needed="syncMoviesAfterMutation" />

      <div v-if="!errorMessage && hasAnyStatusFilter && shouldShowPagination" class="movies-by-list-pagination">
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

<style scoped src="./MoviesByList.css"></style>
