import { MovieModel } from '../models/MovieModel'
import { MovieUsersListsModel } from '../models/MovieUsersListsModel'
import { zetaApiService } from './zetaApiService'

interface MovieListSearchParams {
  title?: string
  isLiked?: boolean | null
  isWatched?: boolean | null
  isSeen?: boolean | null
}

interface GetMyUsersListMoviesParams {
  title?: string
  isWatched?: boolean | null
  isSeen?: boolean | null
  page?: number
  dataPerPage?: number
}

const BASE_PATH = '/mvs/movieuserslists'

class MovieUsersListsService {
  private normalizeMoviePayload(movie: MovieModel): MovieModel {
    const payload = Object.assign(new MovieModel(), movie)
    const sourceMovie = movie as MovieModel & { poster_path?: string; backdrop_path?: string }

    if (!payload.posterPath && sourceMovie.poster_path) {
      payload.posterPath = sourceMovie.poster_path
    }

    if (!payload.backdropPath && sourceMovie.backdrop_path) {
      payload.backdropPath = sourceMovie.backdrop_path
    }

    return payload
  }

  getAllByListId(listId: string): Promise<MovieModel[]> {
    return zetaApiService.get<MovieModel[]>(`${BASE_PATH}/${encodeURIComponent(listId)}`)
  }

  searchByListId(listId: string, params: MovieListSearchParams = {}): Promise<MovieModel[]> {
    const query = this.buildQuery(params)
    return zetaApiService.get<MovieModel[]>(`${BASE_PATH}/${encodeURIComponent(listId)}/search${query}`)
  }

  getListsByUserId(): Promise<MovieUsersListsModel[]> {
    return zetaApiService.get<MovieUsersListsModel[]>(`${BASE_PATH}/getListsByUserId`)
  }

  getMyUsersListMovies(listId: string, params: GetMyUsersListMoviesParams = {}): Promise<MovieModel[]> {
    const query = this.buildQuery({
      listId,
      title: params.title ?? '',
      isWatched: params.isWatched,
      isSeen: params.isSeen,
      page: params.page ?? 1,
      dataPerPage: params.dataPerPage ?? 20
    })

    return zetaApiService.get<MovieModel[]>(`${BASE_PATH}/getMyUsersListMovies${query}`)
  }

  existsByIdTMDBIsWatched(listId: string, idTMDB: number): Promise<boolean> {
    const query = this.buildQuery({ listId, idTMDB })
    return zetaApiService.get<boolean>(`${BASE_PATH}/exists/isWatched${query}`)
  }

  existsByIdTMDBIsSeen(listId: string, idTMDB: number): Promise<boolean> {
    const query = this.buildQuery({ listId, idTMDB })
    return zetaApiService.get<boolean>(`${BASE_PATH}/exists/isSeen${query}`)
  }

  setMovieIsSeenByModel(listId: string, movie: MovieModel): Promise<void> {
    const query = this.buildQuery({ listId })
    return zetaApiService.post<void, MovieModel>(`${BASE_PATH}/isSeen${query}`, this.normalizeMoviePayload(movie))
  }

  setMovieAsIsSeen(listId: string, movie: MovieModel): Promise<void> {
    console.log(movie)
    const requestMovie = this.normalizeMoviePayload(movie)
    requestMovie.isSeen = true
    return this.setMovieIsSeenByModel(listId, requestMovie)
  }

  setMovieAsNotSeen(listId: string, movie: MovieModel): Promise<void> {
    const requestMovie = this.normalizeMoviePayload(movie)
    requestMovie.isSeen = false
    return this.setMovieIsSeenByModel(listId, requestMovie)
  }

  setMovieIsWatchedByModel(listId: string, movie: MovieModel): Promise<void> {
    const query = this.buildQuery({ listId })
    return zetaApiService.post<void, MovieModel>(`${BASE_PATH}/isWatched${query}`, this.normalizeMoviePayload(movie))
  }

  setMovieAsIsWatched(listId: string, idTMDB: number): Promise<void> {
    const movie = new MovieModel()
    movie.idTMDB = idTMDB
    movie.isWatched = true
    return this.setMovieIsWatchedByModel(listId, movie)
  }

  setMovieAsNotWatched(listId: string, idTMDB: number): Promise<void> {
    const movie = new MovieModel()
    movie.idTMDB = idTMDB
    movie.isWatched = false
    return this.setMovieIsWatchedByModel(listId, movie)
  }

  insertMovieByListId(listId: string, movie: MovieModel): Promise<MovieModel> {
    return zetaApiService.post<MovieModel, MovieModel>(`${BASE_PATH}/${encodeURIComponent(listId)}`, movie)
  }

  updateMovieByListId(listId: string, movieId: string, movie: MovieModel): Promise<void> {
    return zetaApiService.put<void, MovieModel>(
      `${BASE_PATH}/${encodeURIComponent(listId)}/${encodeURIComponent(movieId)}`,
      movie
    )
  }

  deleteMovieByListId(listId: string, movieId: string): Promise<void> {
    return zetaApiService.delete<void>(`${BASE_PATH}/${encodeURIComponent(listId)}/${encodeURIComponent(movieId)}`)
  }

  private buildQuery(params: object): string {
    const query = new URLSearchParams()

    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === '') {
        continue
      }

      query.set(key, String(value))
    }

    const queryString = query.toString()
    return queryString ? `?${queryString}` : ''
  }
}

export const movieUsersListsService = new MovieUsersListsService()