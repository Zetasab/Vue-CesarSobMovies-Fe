import { BaseApiService } from './baseApiService'
import { sessionStorageService } from './sessionStorageService'

const TMDB_BASE_URL = 'https://api.themoviedb.org/3/'

class TmdbApiService extends BaseApiService {
  constructor() {
    super(TMDB_BASE_URL)
  }

  async get<T>(path: string, query?: Record<string, string | number | boolean>): Promise<T> {
    const apiKey = sessionStorageService.getTmdbApiKey()
    if (!apiKey) {
      throw new Error('TMDB apiKey is not configured. Login and save the key first.')
    }

    const searchParams = new URLSearchParams()
    searchParams.set('api_key', apiKey)

    if (query) {
      for (const [key, value] of Object.entries(query)) {
        searchParams.set(key, String(value))
      }
    }

    const separator = path.includes('?') ? '&' : '?'
    const pathWithQuery = `${path}${separator}${searchParams.toString()}`

    return this.request<T>(pathWithQuery, { method: 'GET' }, { requiresAuth: false })
  }
}

export const tmdbApiService = new TmdbApiService()