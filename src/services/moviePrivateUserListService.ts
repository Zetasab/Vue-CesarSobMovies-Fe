import { MovieModel } from '../models/MovieModel'
import { zetaApiService } from './zetaApiService'

interface MovieSearchParams {
  ownerId?: string
  title?: string
  isLiked?: boolean | null
  isWatched?: boolean | null
  isSeen?: boolean | null
}

interface MyPrivateMoviesParams {
  title?: string
  isWatched?: boolean | null
  isSeen?: boolean | null
  page?: number
  dataPerPage?: number
}

const BASE_PATH = '/mvs/movieprivateuserlist'

class MoviePrivateUserListService {
  getMyPrivateUserMovies(params: MyPrivateMoviesParams = {}): Promise<MovieModel[]> {
    const query = this.buildQuery(params)
    return zetaApiService.get<MovieModel[]>(`${BASE_PATH}/getMyPrivateUserMovies${query}`)
  }

  getAllByOwnerId(ownerId = ''): Promise<MovieModel[]> {
    const query = this.buildQuery({ ownerId })
    return zetaApiService.get<MovieModel[]>(`${BASE_PATH}/getAllByOwnerId${query}`)
  }

  searchByOwnerId(params: MovieSearchParams = {}): Promise<MovieModel[]> {
    const query = this.buildQuery(params)
    return zetaApiService.get<MovieModel[]>(`${BASE_PATH}/search${query}`)
  }

  existsByIdTMDBIsWatched(idTMDB: number, ownerId = ''): Promise<boolean> {
    const query = this.buildQuery({ idTMDB, ownerId })
    return zetaApiService.get<boolean>(`${BASE_PATH}/exists/isWatched${query}`)
  }

  existsByIdTMDBIsSeen(idTMDB: number, ownerId = ''): Promise<boolean> {
    const query = this.buildQuery({ idTMDB, ownerId })
    return zetaApiService.get<boolean>(`${BASE_PATH}/exists/isSeen${query}`)
  }

  setMovieAsIsSeenByModel(movie: MovieModel, ownerId = ''): Promise<void> {
    const query = this.buildQuery({ ownerId })
    const requestMovie = Object.assign(new MovieModel(), movie)
    requestMovie.isSeen = true
    return zetaApiService.post<void, MovieModel>(`${BASE_PATH}/set/isSeen${query}`, requestMovie)
  }

  setMovieAsIsSeen(idTMDB: number, ownerId = ''): Promise<void> {
    const movie = new MovieModel()
    movie.idTMDB = idTMDB
    movie.isSeen = true
    return this.setMovieAsIsSeenByModel(movie, ownerId)
  }

  setMovieAsNotSeen(idTMDB: number, ownerId = ''): Promise<void> {
    const query = this.buildQuery({ idTMDB, ownerId })
    return zetaApiService.post<void, object>(`${BASE_PATH}/unset/isSeen${query}`, {})
  }

  setMovieAsIsWatchedByModel(movie: MovieModel, ownerId = ''): Promise<void> {
    const query = this.buildQuery({ ownerId })
    return zetaApiService.post<void, MovieModel>(`${BASE_PATH}/set/isWatched${query}`, movie)
  }

  setMovieAsIsWatched(idTMDB: number, ownerId = ''): Promise<void> {
    const movie = new MovieModel()
    movie.idTMDB = idTMDB
    movie.isWatched = true
    return this.setMovieAsIsWatchedByModel(movie, ownerId)
  }

  setMovieAsNotWatched(idTMDB: number, ownerId = ''): Promise<void> {
    const query = this.buildQuery({ idTMDB, ownerId })
    return zetaApiService.post<void, object>(`${BASE_PATH}/unset/isWatched${query}`, {})
  }

  insertMovieByOwnerId(movie: MovieModel, ownerId = ''): Promise<MovieModel> {
    const query = this.buildQuery({ ownerId })
    return zetaApiService.post<MovieModel, MovieModel>(`${BASE_PATH}/insert${query}`, movie)
  }

  updateMovieByOwnerId(movieId: string, movie: MovieModel, ownerId = ''): Promise<void> {
    const query = this.buildQuery({ movieId, ownerId })
    return zetaApiService.put<void, MovieModel>(`${BASE_PATH}/update${query}`, movie)
  }

  deleteMovieByOwnerId(movieId: string, ownerId = ''): Promise<void> {
    const query = this.buildQuery({ movieId, ownerId })
    return zetaApiService.delete<void>(`${BASE_PATH}/delete${query}`)
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

export const moviePrivateUserListService = new MoviePrivateUserListService()