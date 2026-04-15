import { zetaApiService } from './zetaApiService'

type QueryParams = Record<string, string | number | boolean>

class TmdbApiService {
  async get<T>(path: string, query?: QueryParams): Promise<T> {
    return zetaApiService.get<T>(path, query)
  }
}

export const tmdbApiService = new TmdbApiService()