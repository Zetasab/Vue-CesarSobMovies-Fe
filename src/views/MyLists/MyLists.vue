<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { MovieUsersListsModel } from '../../models/MovieUsersListsModel'
import { movieUsersListsService } from '../../services/movieUsersListsService'

const lists = ref<MovieUsersListsModel[]>([])
const isLoading = ref(false)
const errorMessage = ref('')
const totalMovies = computed(() => lists.value.reduce((total, list) => total + list.movies.length, 0))
const averageMoviesPerList = computed(() => {
  if (!lists.value.length) {
    return 0
  }

  return (totalMovies.value / lists.value.length).toFixed(1)
})

async function loadMyLists(): Promise<void> {
  isLoading.value = true
  errorMessage.value = ''

  try {
    lists.value = await movieUsersListsService.getListsByUserId()
  } catch {
    lists.value = []
    errorMessage.value = 'No se pudieron cargar tus listas.'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  void loadMyLists()
})
</script>

<template>
  <main class="my-lists-page">
    <section class="my-lists-header">
      <h1 class="my-lists-title">Mis listas</h1>
      <p class="my-lists-subtitle">Agrupa tus películas por temática y vuelve rápido a cada colección.</p>
    </section>

    <section v-if="!isLoading && !errorMessage" class="my-lists-summary">
      <article class="my-lists-summary-card">
        <p class="my-lists-summary-label">Listas creadas</p>
        <p class="my-lists-summary-value">{{ lists.length }}</p>
      </article>
      <article class="my-lists-summary-card">
        <p class="my-lists-summary-label">Películas en listas</p>
        <p class="my-lists-summary-value">{{ totalMovies }}</p>
      </article>
      <article class="my-lists-summary-card">
        <p class="my-lists-summary-label">Promedio por lista</p>
        <p class="my-lists-summary-value">{{ averageMoviesPerList }}</p>
      </article>
    </section>

    <section class="my-lists-quick-actions">
      <RouterLink to="/buscar" class="my-lists-quick-link">
        <v-icon icon="mdi-magnify" size="18" />
        <span>Buscar películas</span>
      </RouterLink>
      <RouterLink to="/mis-peliculas" class="my-lists-quick-link">
        <v-icon icon="mdi-movie-open-outline" size="18" />
        <span>Ir a Mis películas</span>
      </RouterLink>
    </section>

    <section class="my-lists-content">
      <v-alert v-if="errorMessage" type="error" variant="tonal" density="comfortable">
        {{ errorMessage }}
      </v-alert>

      <v-progress-linear v-else-if="isLoading" indeterminate color="primary" />

      <article v-else-if="!lists.length" class="my-lists-empty-state">
        <v-icon icon="mdi-playlist-remove" size="28" />
        <h2 class="my-lists-empty-title">Aún no tienes listas</h2>
        <p class="my-lists-empty-text">Empieza marcando películas en “Buscar” y guárdalas en una lista personalizada.</p>
        <div class="my-lists-empty-actions">
          <RouterLink to="/buscar" class="my-lists-empty-link">Ir a Buscar</RouterLink>
          <RouterLink to="/mis-peliculas" class="my-lists-empty-link my-lists-empty-link--soft">
            Ver Mis películas
          </RouterLink>
        </div>
      </article>

      <div v-else class="my-lists-grid">
        <RouterLink
          v-for="list in lists"
          :key="list.id"
          class="my-lists-card-link"
          :to="{ name: 'movies-by-list', params: { listId: list.id }, query: { name: list.name } }"
        >
          <article class="my-lists-card">
          <h2 class="my-lists-card-title">{{ list.name }}</h2>
          <p class="my-lists-card-meta">{{ list.movies.length }} película(s)</p>
          </article>
        </RouterLink>
      </div>
    </section>
  </main>
</template>

<style scoped src="./MyLists.css"></style>
