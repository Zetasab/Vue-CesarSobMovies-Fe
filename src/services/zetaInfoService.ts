import { zetaApiService } from './zetaApiService'

class ZetaInfoService {
  getInfo(): Promise<string> {
    return zetaApiService.getInfo()
  }

  getMoviesApi(): Promise<string> {
    return zetaApiService.getMoviesApi()
  }
}

export const zetaInfoService = new ZetaInfoService()