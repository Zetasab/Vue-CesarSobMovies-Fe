<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MoviesScroller from '../../components/MoviesScroller.vue'
import { MovieModel } from '../../models/MovieModel'
import { MovieUsersListsModel } from '../../models/MovieUsersListsModel'
import { moviePrivateUserListService } from '../../services/moviePrivateUserListService'
import { tmdbApiService } from '../../services/tmdbApiService'
import { movieUsersListsService } from '../../services/movieUsersListsService'

type MovieGenre = {
	id: number
	name: string
}

type ProductionCompany = {
	id: number
	logo_path: string | null
	name: string
	origin_country: string
}

type ProductionCountry = {
	iso_3166_1: string
	name: string
}

type SpokenLanguage = {
	english_name: string
	iso_639_1: string
	name: string
}

type MovieCollection = {
	id: number
	name: string
	poster_path: string
	backdrop_path: string
}

type DetailedMovieData = {
	id: number
	title: string
	original_title: string
	tagline: string
	release_date: string
	runtime: number | null
	vote_average: number
	vote_count: number
	popularity: number
	status: string
	original_language: string
	overview: string
	poster_path: string | null
	backdrop_path: string | null
	imdb_id: string | null
	budget: number
	revenue: number
	homepage: string | null
	genres: MovieGenre[]
	production_companies: ProductionCompany[]
	production_countries: ProductionCountry[]
	spoken_languages: SpokenLanguage[]
	belongs_to_collection: MovieCollection | null
}

type MovieCastMember = {
	id: number
	name: string
	character: string
	profile_path: string | null
}

type MovieCreditsResponse = {
	cast: MovieCastMember[]
}

type MovieImageFile = {
	file_path: string
	aspect_ratio: number
	width: number
	height: number
}

type MovieImagesResponse = {
	backdrops: MovieImageFile[]
	posters: MovieImageFile[]
}

type MovieVideo = {
	id: string
	key: string
	name: string
	site: string
	type: string
	official: boolean
}

type MovieVideosResponse = {
	results: MovieVideo[]
}

type TmdbMovieListItem = {
	id: number
	title: string
	overview: string
	poster_path: string | null
	backdrop_path: string | null
	release_date: string
	vote_average: number
}

type TmdbMovieListResponse = {
	results: TmdbMovieListItem[]
}

type ReviewAuthorDetails = {
	name: string | null
	username: string
	avatar_path: string | null
	rating: number | null
}

type MovieReviewItem = {
	id: string
	author: string
	author_details: ReviewAuthorDetails
	content: string
	created_at: string
	updated_at: string
	url: string
}

type MovieReviewsResponse = {
	results: MovieReviewItem[]
}

type ScrollerMovieItem = {
	id: number
	title: string
	overview: string
	poster_path?: string
	backdrop_path?: string
	release_date: string
	vote_average: number
}

const route = useRoute()
const router = useRouter()
const imageBaseUrl = 'https://image.tmdb.org/t/p'
const movie = ref<DetailedMovieData | null>(null)
const castMembers = ref<MovieCastMember[]>([])
const movieVideos = ref<MovieVideo[]>([])
const galleryImages = ref<MovieImageFile[]>([])
const recommendedMovies = ref<ScrollerMovieItem[]>([])
const similarMovies = ref<ScrollerMovieItem[]>([])
const movieReviews = ref<MovieReviewItem[]>([])
const showHeaderVideo = ref(false)
const headerVideoDelayProgress = ref(0)
const isLoadingMovie = ref(false)
const movieLoadError = ref('')
const isImageDialogOpen = ref(false)
const selectedImagePath = ref<string | null>(null)
let headerVideoTimeoutId: number | undefined
let headerVideoProgressIntervalId: number | undefined
const HEADER_VIDEO_DELAY_MS = 5000

const movieIdParam = computed(() => String(route.params.idtmdb ?? ''))
const parsedMovieId = computed(() => Number(movieIdParam.value))
const isMovieIdValid = computed(() => Number.isInteger(parsedMovieId.value) && parsedMovieId.value > 0)
const currentYear = new Date().getFullYear()
const backdropUrl = computed(() => {
	if (!movie.value?.backdrop_path) {
		return ''
	}

	return `${imageBaseUrl}/original${movie.value.backdrop_path}`
})
const watchUrl = computed(() => {
	if (!movie.value?.id) {
		return ''
	}

	return `https://www.themoviedb.org/movie/${movie.value.id}/watch?locale=ES`
})
const collectionUrl = computed(() => {
	const collectionId = movie.value?.belongs_to_collection?.id
	if (!collectionId) {
		return 'https://www.themoviedb.org/collection/'
	}

	return `https://www.themoviedb.org/collection/${collectionId}`
})
const collectionBackgroundStyle = computed(() => {
	const collection = movie.value?.belongs_to_collection
	if (!collection) {
		return {}
	}

	const collectionImagePath = collection.backdrop_path || collection.poster_path
	if (!collectionImagePath) {
		return {}
	}

	return {
		backgroundImage: `linear-gradient(90deg, rgba(0, 5, 13, 0.88) 0%, rgba(0, 5, 13, 0.55) 50%, rgba(0, 5, 13, 0.72) 100%), url(${imageBaseUrl}/original${collectionImagePath})`
	}
})
const websiteUrl = computed(() => movie.value?.homepage?.trim() ?? '')
const maxMoneyValue = computed(() => Math.max(movie.value?.budget ?? 0, movie.value?.revenue ?? 0, 1))
const budgetPercent = computed(() => ((movie.value?.budget ?? 0) / maxMoneyValue.value) * 100)
const revenuePercent = computed(() => ((movie.value?.revenue ?? 0) / maxMoneyValue.value) * 100)
const formattedBudget = computed(() => formatCurrency(movie.value?.budget ?? 0))
const formattedRevenue = computed(() => formatCurrency(movie.value?.revenue ?? 0))
const ratingPercent = computed(() => Math.max(0, Math.min((movie.value?.vote_average ?? 0) * 10, 100)))
const formattedRatingPercent = computed(() => `${Math.round(ratingPercent.value)}%`)
const ratingToneClass = computed(() => {
	if (ratingPercent.value < 40) {
		return 'is-low'
	}

	if (ratingPercent.value < 70) {
		return 'is-mid'
	}

	return 'is-high'
})
const selectedImageUrl = computed(() => {
	if (!selectedImagePath.value) {
		return ''
	}

	return `${imageBaseUrl}/original${selectedImagePath.value}`
})
const featuredVideo = computed(() => {
	const youtubeVideos = movieVideos.value.filter((video) => video.site === 'YouTube' && video.key)
	if (!youtubeVideos.length) {
		return null
	}

	const officialTrailer = youtubeVideos.find((video) => video.type === 'Trailer' && video.official)
	if (officialTrailer) {
		return officialTrailer
	}

	const anyTrailer = youtubeVideos.find((video) => video.type === 'Trailer')
	if (anyTrailer) {
		return anyTrailer
	}

	return youtubeVideos[0]
})
const featuredVideoEmbedUrl = computed(() => {
	if (!featuredVideo.value) {
		return ''
	}

	return `https://www.youtube.com/embed/${featuredVideo.value.key}`
})
const headerVideoEmbedUrl = computed(() => {
	if (!featuredVideo.value?.key) {
		return ''
	}

	const trailerKey = featuredVideo.value.key
	return `https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&playsinline=1&loop=1&playlist=${trailerKey}`
})
const formattedDuration = computed(() => {
	const totalSeconds = (movie.value?.runtime ?? 0) * 60
	const hours = Math.floor(totalSeconds / 3600)
	const minutes = Math.floor((totalSeconds % 3600) / 60)
	const seconds = totalSeconds % 60

	return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
})

type MovieActionType = 'seen' | 'watch'

const seenMovieIds = ref<Set<number>>(new Set())
const watchLaterMovieIds = ref<Set<number>>(new Set())
const isMobileViewport = ref(false)
const desktopMenuKey = ref<MovieActionType | null>(null)
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

function formatCurrency(amount: number): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		maximumFractionDigits: 0
	}).format(amount)
}

function isSeen(movieId: number): boolean {
	return seenMovieIds.value.has(movieId)
}

function isWatchLater(movieId: number): boolean {
	return watchLaterMovieIds.value.has(movieId)
}

function isDesktopMenuOpen(action: MovieActionType): boolean {
	return !isMobileViewport.value && desktopMenuKey.value === action
}

function isListActive(listId: string): boolean {
	return Boolean(listMembershipById.value[listId])
}

function buildMovieModel(): MovieModel {
	if (!movie.value) {
		throw new Error('Movie detail is not loaded.')
	}

	const movieModel = new MovieModel()
	movieModel.idTMDB = movie.value.id
	movieModel.title = movie.value.title
	movieModel.originalTitle = movie.value.original_title
	movieModel.overview = movie.value.overview
	movieModel.posterPath = movie.value.poster_path ?? ''
	movieModel.backdropPath = movie.value.backdrop_path ?? ''
	movieModel.releaseDate = movie.value.release_date
	movieModel.voteAverage = movie.value.vote_average
	movieModel.voteCount = movie.value.vote_count
	movieModel.originalLanguage = movie.value.original_language

	return movieModel
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

	const movieModel = buildMovieModel()
	const isCurrentlyActive = isListActive(listId)
	pendingListId.value = listId

	try {
		if (selectedAction.value === 'seen') {
			if (isCurrentlyActive) {
				await movieUsersListsService.setMovieAsNotSeen(listId, movieModel)
			} else {
				await movieUsersListsService.setMovieAsIsSeen(listId, movieModel)
			}
		} else {
			movieModel.isWatched = !isCurrentlyActive
			await movieUsersListsService.setMovieIsWatchedByModel(listId, movieModel)
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

	const movieModel = buildMovieModel()
	isPrivateListPending.value = true
	const isCurrentlyActive = isPrivateListActive.value

	try {
		if (selectedAction.value === 'seen') {
			if (isCurrentlyActive) {
				await moviePrivateUserListService.setMovieAsNotSeen(movieModel.idTMDB)
				seenMovieIds.value.delete(movieModel.idTMDB)
			} else {
				await moviePrivateUserListService.setMovieAsIsSeenByModel(movieModel)
				seenMovieIds.value.add(movieModel.idTMDB)
			}
		} else {
			if (isCurrentlyActive) {
				await moviePrivateUserListService.setMovieAsNotWatched(movieModel.idTMDB)
				watchLaterMovieIds.value.delete(movieModel.idTMDB)
			} else {
				movieModel.isWatched = true
				await moviePrivateUserListService.setMovieAsIsWatchedByModel(movieModel)
				watchLaterMovieIds.value.add(movieModel.idTMDB)
			}
		}

		isPrivateListActive.value = !isCurrentlyActive
		successSnackbarMessage.value = 'Guardado correctamente'
		isSuccessSnackbarOpen.value = true
	} finally {
		isPrivateListPending.value = false
	}
}

function openActionMenu(action: MovieActionType): void {
	if (!movie.value) {
		return
	}

	selectedMovieId.value = movie.value.id
	selectedAction.value = action

	if (isMobileViewport.value) {
		isMobileActionDialogOpen.value = true
		desktopMenuKey.value = null
		void loadListsForAction(action, movie.value.id)
		return
	}

	desktopMenuKey.value = desktopMenuKey.value === action ? null : action
	if (desktopMenuKey.value) {
		void loadListsForAction(action, movie.value.id)
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

function companyLogoUrl(logoPath: string | null): string {
	if (!logoPath) {
		return ''
	}

	return `${imageBaseUrl}/w92${logoPath}`
}

function castImageUrl(profilePath: string | null): string {
	if (!profilePath) {
		return ''
	}

	return `${imageBaseUrl}/w185${profilePath}`
}

function galleryThumbUrl(filePath: string): string {
	return `${imageBaseUrl}/w342${filePath}`
}

function openImageDialog(filePath: string): void {
	selectedImagePath.value = filePath
	isImageDialogOpen.value = true
}

function formatReviewDate(value: string): string {
	if (!value) {
		return ''
	}

	const parsedDate = new Date(value)
	if (Number.isNaN(parsedDate.getTime())) {
		return value
	}

	return new Intl.DateTimeFormat('es-ES', {
		day: '2-digit',
		month: 'short',
		year: 'numeric'
	}).format(parsedDate)
}

function reviewAvatarUrl(avatarPath: string | null | undefined): string {
	if (!avatarPath) {
		return 'https://www.gravatar.com/avatar/?d=mp&s=64'
	}

	if (avatarPath.startsWith('/http')) {
		return avatarPath.slice(1)
	}

	if (avatarPath.startsWith('http')) {
		return avatarPath
	}

	return `${imageBaseUrl}/w45${avatarPath}`
}

function mapScrollerMovies(movies: TmdbMovieListItem[] | undefined): ScrollerMovieItem[] {
	return (movies ?? [])
		.filter((movieItem) => movieItem?.id)
		.map((movieItem) => ({
			id: movieItem.id,
			title: movieItem.title ?? 'Sin título',
			overview: movieItem.overview ?? '',
			poster_path: movieItem.poster_path ?? undefined,
			backdrop_path: movieItem.backdrop_path ?? undefined,
			release_date: movieItem.release_date ?? '',
			vote_average: movieItem.vote_average ?? 0
		}))
}

function mapReviews(reviews: MovieReviewItem[] | undefined): MovieReviewItem[] {
	return (reviews ?? [])
		.filter((review) => Boolean(review?.id && review?.content?.trim()))
		.map((review) => ({
			id: review.id,
			author: review.author ?? '',
			author_details: {
				name: review.author_details?.name ?? null,
				username: review.author_details?.username ?? review.author ?? 'Anónimo',
				avatar_path: review.author_details?.avatar_path ?? null,
				rating: review.author_details?.rating ?? null
			},
			content: review.content,
			created_at: review.created_at ?? '',
			updated_at: review.updated_at ?? review.created_at ?? '',
			url: review.url ?? ''
		}))
		.slice(0, 6)
}

function clearHeaderVideoTimer(): void {
	if (typeof window === 'undefined') {
		return
	}

	if (headerVideoTimeoutId !== undefined) {
		window.clearTimeout(headerVideoTimeoutId)
		headerVideoTimeoutId = undefined
	}

	if (headerVideoProgressIntervalId !== undefined) {
		window.clearInterval(headerVideoProgressIntervalId)
		headerVideoProgressIntervalId = undefined
	}

	headerVideoDelayProgress.value = 0
}

function startHeaderVideoDelayProgress(): void {
	if (typeof window === 'undefined') {
		return
	}

	const startedAt = Date.now()
	headerVideoDelayProgress.value = 0
	headerVideoProgressIntervalId = window.setInterval(() => {
		const elapsedMs = Date.now() - startedAt
		const progress = Math.min((elapsedMs / HEADER_VIDEO_DELAY_MS) * 100, 100)
		headerVideoDelayProgress.value = progress

		if (progress >= 100 && headerVideoProgressIntervalId !== undefined) {
			window.clearInterval(headerVideoProgressIntervalId)
			headerVideoProgressIntervalId = undefined
		}
	}, 60)
}

function scheduleHeaderVideo(): void {
	clearHeaderVideoTimer()
	showHeaderVideo.value = false

	if (!featuredVideo.value || typeof window === 'undefined') {
		return
	}

	startHeaderVideoDelayProgress()

	headerVideoTimeoutId = window.setTimeout(() => {
		showHeaderVideo.value = true
		headerVideoTimeoutId = undefined
		headerVideoDelayProgress.value = 100
	}, HEADER_VIDEO_DELAY_MS)
}

async function loadMovieDetails(): Promise<void> {
	if (!isMovieIdValid.value) {
		movie.value = null
		castMembers.value = []
		recommendedMovies.value = []
		similarMovies.value = []
		movieReviews.value = []
		movieLoadError.value = 'Id de película inválido.'
		return
	}

	isLoadingMovie.value = true
	movieLoadError.value = ''
	movie.value = null
	castMembers.value = []
	movieVideos.value = []
	galleryImages.value = []
	recommendedMovies.value = []
	similarMovies.value = []
	movieReviews.value = []
	showHeaderVideo.value = false
	clearHeaderVideoTimer()
	selectedImagePath.value = null
	isImageDialogOpen.value = false
	desktopMenuKey.value = null
	isMobileActionDialogOpen.value = false

	try {
		const [movieData, credits, videos, images, recommendations, similar] = await Promise.all([
			tmdbApiService.get<DetailedMovieData>(`movie/${parsedMovieId.value}`, { language: 'es-ES' }),
			tmdbApiService.get<MovieCreditsResponse>(`movie/${parsedMovieId.value}/credits`, { language: 'es-ES' }),
			tmdbApiService.get<MovieVideosResponse>(`movie/${parsedMovieId.value}/videos`, { language: 'es-ES' }),
			tmdbApiService.get<MovieImagesResponse>(`movie/${parsedMovieId.value}/images`),
			tmdbApiService.get<TmdbMovieListResponse>(`movie/${parsedMovieId.value}/recommendations`, { language: 'es-ES' }),
			tmdbApiService.get<TmdbMovieListResponse>(`movie/${parsedMovieId.value}/similar`, { language: 'es-ES' })
		])

		movie.value = movieData
		castMembers.value = credits.cast ?? []
		movieVideos.value = videos.results ?? []
		const uniqueImages = [...(images.backdrops ?? []), ...(images.posters ?? [])].filter(
			(img, index, arr) => arr.findIndex((candidate) => candidate.file_path === img.file_path) === index
		)
		galleryImages.value = uniqueImages.slice(0, 24)
		recommendedMovies.value = mapScrollerMovies(recommendations.results)
		similarMovies.value = mapScrollerMovies(similar.results)

		let loadedReviews: MovieReviewItem[] = []

		try {
			const reviewsEs = await tmdbApiService.get<MovieReviewsResponse>(`movie/${parsedMovieId.value}/reviews`, {
				language: 'es-ES'
			})
			loadedReviews = reviewsEs.results ?? []

			if (!loadedReviews.length) {
				const reviewsEn = await tmdbApiService.get<MovieReviewsResponse>(`movie/${parsedMovieId.value}/reviews`, {
					language: 'en-US'
				})
				loadedReviews = reviewsEn.results ?? []
			}
		} catch {
			loadedReviews = []
		}

		movieReviews.value = mapReviews(loadedReviews)
	} catch {
		movieLoadError.value = 'No se pudo cargar el detalle de la película.'
	} finally {
		isLoadingMovie.value = false
	}
}

function goBack(): void {
	if (typeof window !== 'undefined' && window.history.length > 1) {
		window.history.back()
		return
	}

	router.push('/')
}

onMounted(() => {
	updateViewport()
	window.addEventListener('resize', updateViewport)
	document.addEventListener('click', onDocumentClick)
})

watch(
	featuredVideo,
	() => {
		scheduleHeaderVideo()
	},
	{ immediate: true }
)

watch(
	() => route.params.idtmdb,
	() => {
		void loadMovieDetails()
	},
	{ immediate: true }
)

onBeforeUnmount(() => {
	clearHeaderVideoTimer()
	window.removeEventListener('resize', updateViewport)
	document.removeEventListener('click', onDocumentClick)
})
</script>

<template>
	<main v-if="isLoadingMovie" class="detailed-movie-page detailed-movie-page--not-found">
		<section class="not-found-shell">
			<h1>Cargando detalle...</h1>
		</section>
	</main>

	<main v-else-if="movie" class="detailed-movie-page">
		<section class="detailed-movie-header">
			<img v-if="movie.backdrop_path" :src="backdropUrl" :alt="`Backdrop de ${movie.title}`"
				class="detailed-movie-header-image"
				:class="{ 'is-hidden': showHeaderVideo && Boolean(featuredVideo) }" />
			<div v-else class="detailed-movie-header-image detailed-movie-header-image--fallback"
				:class="{ 'is-hidden': showHeaderVideo && Boolean(featuredVideo) }" aria-hidden="true"></div>
			<iframe v-if="featuredVideo && showHeaderVideo" :key="featuredVideo.key" :src="headerVideoEmbedUrl"
				:title="`Trailer de ${movie.title}`" class="detailed-movie-header-video"
				allow="autoplay; encrypted-media; picture-in-picture" tabindex="-1"></iframe>
			<div class="detailed-movie-header-tools">
				<a href="#" class="detailed-movie-go-back" @click.prevent="goBack">
					<v-icon icon="mdi-arrow-left" size="16" />
					<span>Volver atras</span>
				</a>
			</div>
			<div class="detailed-movie-title-row" @click.stop>
				<div class="detailed-movie-title-stack">
					<h1 class="detailed-movie-header-title">{{ movie.title }}</h1>
					<div v-if="featuredVideo && !showHeaderVideo" class="detailed-movie-header-delay-slider"
						aria-hidden="true">
						<div class="detailed-movie-header-delay-slider-label">Trailer</div>
						<div class="detailed-movie-header-delay-slider-track">
							<span class="detailed-movie-header-delay-slider-fill"
								:style="{ width: `${Math.round(headerVideoDelayProgress)}%` }"></span>
						</div>
					</div>
				</div>

				<div class="detailed-movie-title-actions">
					<div class="detailed-movie-action-wrapper" :class="{ 'is-open': isDesktopMenuOpen('seen') }">
						<button class="detailed-movie-action detailed-movie-action--seen"
							:class="{ 'is-active': isSeen(movie.id) }" type="button" aria-label="Marcar como vista"
							@click.stop="openActionMenu('seen')">
							<v-icon :icon="isSeen(movie.id) ? 'mdi-check-circle' : 'mdi-check-circle-outline'"
								size="20" />
						</button>
						<div v-if="isDesktopMenuOpen('seen')" class="detailed-movie-action-menu" @click.stop>
							<div v-if="isLoadingActionLists" class="detailed-movie-menu-state">Cargando...</div>
							<div v-else-if="actionListsError" class="detailed-movie-menu-state">{{ actionListsError }}
							</div>
							<div v-else>
								<p class="detailed-movie-dialog-section-title">En mis películas</p>
								<button class="detailed-movie-dialog-list-item detailed-movie-dialog-list-item--private"
									:class="{ 'is-active': isPrivateListActive }" type="button"
									:disabled="isPrivateListPending" @click.stop="togglePrivateListSelection()">
									<v-icon v-if="isPrivateListActive" icon="mdi-check" size="14"
										class="detailed-movie-menu-item-check" />
									Lista privada
								</button>

								<p class="detailed-movie-dialog-section-title">En mis listas</p>
								<div v-if="!userLists.length" class="detailed-movie-menu-state">Sin listas</div>
								<div v-else class="detailed-movie-dialog-list">
									<button v-for="list in userLists" :key="list.id"
										class="detailed-movie-dialog-list-item"
										:class="{ 'is-active': isListActive(list.id) }" type="button"
										:disabled="pendingListId === list.id"
										@click.stop="toggleListSelection(list.id)">
										<v-icon v-if="isListActive(list.id)" icon="mdi-check" size="14"
											class="detailed-movie-menu-item-check" />
										{{ list.name }}
									</button>
								</div>
							</div>
						</div>
					</div>

					<div class="detailed-movie-action-wrapper" :class="{ 'is-open': isDesktopMenuOpen('watch') }">
						<button class="detailed-movie-action detailed-movie-action--watch"
							:class="{ 'is-active': isWatchLater(movie.id) }" type="button"
							aria-label="Añadir a quiero ver" @click.stop="openActionMenu('watch')">
							<v-icon :icon="isWatchLater(movie.id) ? 'mdi-bookmark' : 'mdi-bookmark-plus-outline'"
								size="20" />
						</button>
						<div v-if="isDesktopMenuOpen('watch')" class="detailed-movie-action-menu" @click.stop>
							<div v-if="isLoadingActionLists" class="detailed-movie-menu-state">Cargando...</div>
							<div v-else-if="actionListsError" class="detailed-movie-menu-state">{{ actionListsError }}
							</div>
							<div v-else>
								<p class="detailed-movie-dialog-section-title">En mis películas</p>
								<button class="detailed-movie-dialog-list-item detailed-movie-dialog-list-item--private"
									:class="{ 'is-active': isPrivateListActive }" type="button"
									:disabled="isPrivateListPending" @click.stop="togglePrivateListSelection()">
									<v-icon v-if="isPrivateListActive" icon="mdi-check" size="14"
										class="detailed-movie-menu-item-check" />
									Lista privada
								</button>

								<p class="detailed-movie-dialog-section-title">En mis listas</p>
								<div v-if="!userLists.length" class="detailed-movie-menu-state">Sin listas</div>
								<div v-else class="detailed-movie-dialog-list">
									<button v-for="list in userLists" :key="list.id"
										class="detailed-movie-dialog-list-item"
										:class="{ 'is-active': isListActive(list.id) }" type="button"
										:disabled="pendingListId === list.id"
										@click.stop="toggleListSelection(list.id)">
										<v-icon v-if="isListActive(list.id)" icon="mdi-check" size="14"
											class="detailed-movie-menu-item-check" />
										{{ list.name }}
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>

		<section class="detailed-movie-container">
			<section class="detailed-movie-highlight">
				<article class="detailed-movie-highlight-main">
					<div class="detailed-movie-meta-row">
						<div class="detailed-movie-date-group">
							<v-icon icon="mdi-calendar-month-outline" size="18" />
							<p class="detailed-movie-date">{{ movie.release_date }}</p>
						</div>
						<div class="detailed-movie-duration-group">
							<v-icon icon="mdi-timer-outline" size="18" />
							<p class="detailed-movie-date">{{ formattedDuration }}</p>
						</div>
					</div>
					<p class="detailed-movie-description">{{ movie.overview }}</p>
					<a class="detailed-movie-watch" :href="watchUrl" target="_blank" rel="noopener noreferrer">Ver
						película</a>

					<div class="detailed-movie-genres">
						<span v-for="genre in movie.genres" :key="genre.id" class="genre-chip">{{ genre.name }}</span>
					</div>
				</article>

				<article class="detailed-movie-chart" aria-label="Comparación presupuesto y recaudación">
					<div class="detailed-movie-chart-header">
						<div class="detailed-movie-rating">
							<div class="detailed-movie-rating-circle" :class="ratingToneClass"
								:style="{ '--rating-percent': String(ratingPercent) }" role="img"
								aria-label="Puntuación de la película">
								<span>{{ formattedRatingPercent }}</span>
							</div>
							<p class="detailed-movie-rating-votes">{{ movie.vote_count }} votos</p>
						</div>

						<a v-if="websiteUrl" class="detailed-movie-site-link" :href="websiteUrl" target="_blank"
							rel="noopener noreferrer" aria-label="Website" title="Website">
							<v-icon icon="mdi-web" size="18" />
							<span>Website</span>
						</a>
					</div>

					<div class="chart-row">
						<div class="chart-label-row">
							<span>Budget</span>
							<strong>{{ formattedBudget }}</strong>
						</div>
						<div class="chart-track">
							<span class="chart-bar chart-bar--budget" :style="{ width: `${budgetPercent}%` }"></span>
						</div>
					</div>

					<div class="chart-row">
						<div class="chart-label-row">
							<span>Revenue</span>
							<strong>{{ formattedRevenue }}</strong>
						</div>
						<div class="chart-track">
							<span class="chart-bar chart-bar--revenue" :style="{ width: `${revenuePercent}%` }"></span>
						</div>
					</div>

					<ul class="detailed-movie-companies">
						<li v-for="company in movie.production_companies" :key="company.id"
							class="detailed-movie-company-item">
							<img v-if="company.logo_path" :src="companyLogoUrl(company.logo_path)" :alt="company.name"
								class="company-logo" />
							<span v-else class="company-logo company-logo--fallback">
								<v-icon icon="mdi-domain" size="13" />
							</span>
							<span class="company-name">{{ company.name }}</span>
						</li>
					</ul>
				</article>
			</section>

			<section v-if="castMembers.length" class="detailed-movie-cast">
				<h2 class="detailed-movie-cast-title">Reparto</h2>
				<div class="detailed-movie-cast-scroll">
					<article v-for="actor in castMembers" :key="actor.id" class="detailed-movie-cast-card">
						<img v-if="actor.profile_path" :src="castImageUrl(actor.profile_path)" :alt="actor.name"
							class="detailed-movie-cast-image" />
						<span v-else class="detailed-movie-cast-image detailed-movie-cast-image--fallback">
							<v-icon icon="mdi-account" size="18" />
						</span>
						<p class="detailed-movie-cast-name">{{ actor.name }}</p>
						<p class="detailed-movie-cast-character">{{ actor.character || 'Sin personaje' }}</p>
					</article>
				</div>
			</section>
		</section>

		<section class="detailed-movie-container">

			<section v-if="featuredVideo" class="detailed-movie-video">
				<h2 class="detailed-movie-scroller-title">Trailer</h2>
				<div class="detailed-movie-video-shell">
					<iframe :src="featuredVideoEmbedUrl" :title="featuredVideo.name" class="detailed-movie-video-frame"
						allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
						allowfullscreen></iframe>
				</div>
			</section>

			<section v-if="galleryImages.length" class="detailed-movie-gallery">
				<h2 class="detailed-movie-gallery-title">Imágenes</h2>
				<div class="detailed-movie-gallery-grid">
					<button v-for="image in galleryImages" :key="image.file_path" class="detailed-movie-gallery-item"
						type="button" @click="openImageDialog(image.file_path)">
						<img :src="galleryThumbUrl(image.file_path)" alt="Imagen de la película"
							class="detailed-movie-gallery-img" />
					</button>
				</div>
			</section>
		</section>
		<section v-if="movie.belongs_to_collection" class="detailed-movie-collection"
			:style="collectionBackgroundStyle">
			<div class="detailed-movie-collection-content">
				<h2 class="detailed-movie-collection-title">{{ movie.belongs_to_collection.name }}</h2>
				<a class="detailed-movie-collection-link" :href="collectionUrl" target="_blank"
					rel="noopener noreferrer">
					Ver colección
				</a>
			</div>
		</section>
		<section class="detailed-movie-container">
			<section v-if="recommendedMovies.length" class="detailed-movie-scroller-section mt-15">
				<h2 class="detailed-movie-scroller-title">Recomendadas</h2>
				<MoviesScroller :movies="recommendedMovies" />
			</section>

			<section v-if="similarMovies.length" class="detailed-movie-scroller-section mt-15">
				<h2 class="detailed-movie-scroller-title">Similares</h2>
				<MoviesScroller :movies="similarMovies" />
			</section>

			<section class="detailed-movie-reviews mt-15">
				<h2 class="detailed-movie-reviews-title">Reviews</h2>

				<p v-if="!movieReviews.length" class="detailed-movie-reviews-empty">Aún no hay reviews para esta
					película.</p>

				<div v-else class="detailed-movie-reviews-grid">
					<article v-for="review in movieReviews" :key="review.id" class="detailed-movie-review-card">
						<div class="detailed-movie-review-header">
							<div class="detailed-movie-review-author-block">
								<img :src="reviewAvatarUrl(review.author_details.avatar_path)"
									:alt="`Avatar de ${review.author_details.username || review.author}`"
									class="detailed-movie-review-avatar" loading="lazy" referrerpolicy="no-referrer" />
								<div>
									<h3 class="detailed-movie-review-author">
										{{ review.author_details.name || review.author_details.username || review.author
										}}
									</h3>
									<p class="detailed-movie-review-username">@{{ review.author_details.username ||
										review.author }}</p>
								</div>
								<p class="detailed-movie-review-date">{{ formatReviewDate(review.updated_at ||
									review.created_at) }}</p>
							</div>
							<span v-if="review.author_details.rating !== null" class="detailed-movie-review-rating">
								⭐ {{ Number(review.author_details.rating).toFixed(1) }}
							</span>
						</div>

						<p class="detailed-movie-review-content">{{ review.content }}</p>

						<a class="detailed-movie-review-link" :href="review.url" target="_blank"
							rel="noopener noreferrer">
							Leer review completa
						</a>
					</article>
				</div>
			</section>
		</section>

		<footer class="detailed-movie-footer">
			<div class="detailed-movie-footer-content">
				<p class="detailed-movie-footer-copy">© {{ currentYear }} Zeta Movies</p>
				<div class="detailed-movie-footer-links">
					<a :href="watchUrl" target="_blank" rel="noopener noreferrer">Watch</a>
					<a :href="`https://www.themoviedb.org/movie/${movie.id}`" target="_blank"
						rel="noopener noreferrer">TMDB</a>
				</div>
			</div>
		</footer>
	</main>

	<main v-else class="detailed-movie-page detailed-movie-page--not-found">
		<section class="not-found-shell">
			<h1>{{ movieLoadError || 'No se encontró el detalle de esta película' }}</h1>
			<p>Id solicitada: {{ movieIdParam }}</p>
			<a href="#" class="detailed-movie-back" @click.prevent="goBack">
				<v-icon icon="mdi-arrow-left" size="16" />
				<span>Volver</span>
			</a>
		</section>
	</main>

	<v-dialog v-model="isMobileActionDialogOpen" max-width="320">
		<v-card class="detailed-movie-dialog-card">
			<v-card-text>
				<div v-if="isLoadingActionLists" class="detailed-movie-menu-state">Cargando...</div>
				<div v-else-if="actionListsError" class="detailed-movie-menu-state">{{ actionListsError }}</div>
				<div v-else>
					<p class="detailed-movie-dialog-section-title">En mis películas</p>
					<button class="detailed-movie-dialog-list-item detailed-movie-dialog-list-item--private"
						:class="{ 'is-active': isPrivateListActive }" type="button" :disabled="isPrivateListPending"
						@click="togglePrivateListSelection()">
						<v-icon v-if="isPrivateListActive" icon="mdi-check" size="14"
							class="detailed-movie-menu-item-check" />
						Lista privada
					</button>

					<p class="detailed-movie-dialog-section-title">En mis listas</p>
					<div v-if="!userLists.length" class="detailed-movie-menu-state">Sin listas</div>
					<div v-else class="detailed-movie-dialog-list">
						<button v-for="list in userLists" :key="list.id" class="detailed-movie-dialog-list-item"
							:class="{ 'is-active': isListActive(list.id) }" type="button"
							:disabled="pendingListId === list.id" @click="toggleListSelection(list.id)">
							<v-icon v-if="isListActive(list.id)" icon="mdi-check" size="14"
								class="detailed-movie-menu-item-check" />
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

	<v-dialog v-model="isImageDialogOpen" max-width="1320">
		<v-card class="detailed-movie-image-dialog">
			<v-card-text class="detailed-movie-image-dialog-content">
				<img v-if="selectedImageUrl" :src="selectedImageUrl" alt="Imagen ampliada"
					class="detailed-movie-image-full" />
			</v-card-text>
			<v-card-actions>
				<v-spacer />
				<v-btn variant="text" @click="isImageDialogOpen = false">Cerrar</v-btn>
			</v-card-actions>
		</v-card>
	</v-dialog>

	<v-snackbar v-model="isSuccessSnackbarOpen" color="success" timeout="1800">
		{{ successSnackbarMessage }}
	</v-snackbar>
</template>

<style scoped src="./DetailedMovie.css"></style>