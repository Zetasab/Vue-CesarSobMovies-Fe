import { zetaApiService } from './zetaApiService'
import { getCurrentUserRequestHeaders } from './userRequestHeaders'
import type { MovieSummary } from '../models/MovieSummary'

const BASE_PATH = '/wishlistmovies'

function normalizeMovieIds(items: unknown[]): number[] {
  const ids = items
    .map((item) => {
      if (typeof item === 'number' && Number.isInteger(item) && item > 0) {
        return item
      }

      if (typeof item === 'string') {
        const parsed = Number(item)
        return Number.isInteger(parsed) && parsed > 0 ? parsed : 0
      }

      if (typeof item !== 'object' || item === null) {
        return 0
      }

      const rawMovieId = (item as { movieId?: unknown; MovieId?: unknown }).movieId
        ?? (item as { movieId?: unknown; MovieId?: unknown }).MovieId
      const parsedMovieId = Number(rawMovieId)
      return Number.isInteger(parsedMovieId) && parsedMovieId > 0 ? parsedMovieId : 0
    })
    .filter((id) => id > 0)

  return Array.from(new Set(ids))
}

class WishlistMoviesService {
  getAllByUserId(): Promise<unknown[]> {
    return zetaApiService.get<unknown[]>(BASE_PATH, undefined, {
      headers: getCurrentUserRequestHeaders()
    })
  }

  async getMovieIdsList(): Promise<number[]> {
    const response = await zetaApiService.get<unknown[]>(`${BASE_PATH}/ids`, undefined, {
      headers: getCurrentUserRequestHeaders()
    })

    return normalizeMovieIds(response)
  }

  addMovie(movie: MovieSummary): Promise<void> {
    return zetaApiService.post<void, MovieSummary>(BASE_PATH, movie, {
      headers: getCurrentUserRequestHeaders()
    })
  }

  deleteMovie(movieId: number): Promise<void> {
    return zetaApiService.delete<void>(`${BASE_PATH}/${movieId}`, {
      headers: getCurrentUserRequestHeaders()
    })
  }
}

export const wishlistMoviesService = new WishlistMoviesService()
