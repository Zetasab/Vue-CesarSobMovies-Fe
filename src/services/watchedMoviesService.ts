import { zetaApiService } from './zetaApiService'
import { getCurrentUserRequestHeaders } from './userRequestHeaders'

const BASE_PATH = '/watchedmovies'

type MovieRelationApiItem = {
  movieId?: unknown
  MovieId?: unknown
}

function normalizeMovieIds(items: unknown[]): number[] {
  const ids = items
    .map((item) => {
      if (typeof item === 'number' && Number.isInteger(item) && item > 0) {
        return item
      }

      if (typeof item !== 'object' || item === null) {
        return 0
      }

      const relation = item as MovieRelationApiItem
      const rawMovieId = relation.movieId ?? relation.MovieId
      const parsedMovieId = Number(rawMovieId)
      return Number.isInteger(parsedMovieId) && parsedMovieId > 0 ? parsedMovieId : 0
    })
    .filter((id) => id > 0)

  return Array.from(new Set(ids))
}

class WatchedMoviesService {
  getAllByUserId(): Promise<unknown[]> {
    return zetaApiService.get<unknown[]>(BASE_PATH, undefined, {
      headers: getCurrentUserRequestHeaders()
    })
  }

  async getMovieIdsList(): Promise<number[]> {
    const response = await zetaApiService.get<unknown[]>(BASE_PATH, undefined, {
      headers: getCurrentUserRequestHeaders()
    })

    return normalizeMovieIds(response)
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
