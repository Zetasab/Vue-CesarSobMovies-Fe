import { zetaApiService } from './zetaApiService'
import { getCurrentUserRequestHeaders } from './userRequestHeaders'

const BASE_PATH = '/watchedmovies'

class WatchedMoviesService {
  getAllByUserId(): Promise<unknown[]> {
    return zetaApiService.get<unknown[]>(BASE_PATH, undefined, {
      headers: getCurrentUserRequestHeaders()
    })
  }

  getMovieIdsList(): Promise<number[]> {
    return zetaApiService.get<number[]>(`${BASE_PATH}/ids`, undefined, {
      headers: getCurrentUserRequestHeaders()
    })
  }

  addMovie(movieId: number): Promise<void> {
    return zetaApiService.post<void, object>(`${BASE_PATH}/${movieId}`, {}, {
      headers: getCurrentUserRequestHeaders()
    })
  }

  deleteMovie(movieId: number): Promise<void> {
    return zetaApiService.delete<void>(`${BASE_PATH}/${movieId}`, {
      headers: getCurrentUserRequestHeaders()
    })
  }
}

export const watchedMoviesService = new WatchedMoviesService()
