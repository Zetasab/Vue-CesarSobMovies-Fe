import { BaseApiService } from './baseApiService'
import { sessionStorageService } from './sessionStorageService'

const DEV_BASE_URL = 'http://localhost:5300/'
const PROD_BASE_URL = 'https://zetaapi.up.railway.app/'

const baseUrl = import.meta.env.VITE_ZETA_API_BASE_URL ?? (import.meta.env.DEV ? DEV_BASE_URL : PROD_BASE_URL)

type QueryParams = Record<string, string | number | boolean>

interface RequestOptions {
  requiresAuth?: boolean
}

class ZetaApiService extends BaseApiService {
  constructor() {
    super(baseUrl, () => sessionStorageService.getAuthSession()?.token ?? null)
  }

  get<T>(path: string, query?: QueryParams, options?: RequestOptions): Promise<T> {
    const pathWithQuery = this.appendQuery(path, query)
    return this.request<T>(this.withMoviesPrefix(pathWithQuery), { method: 'GET' }, options)
  }

  post<TResponse, TBody = unknown>(path: string, body: TBody, options?: RequestOptions): Promise<TResponse> {
    return this.request<TResponse>(this.withMoviesPrefix(path), {
      method: 'POST',
      body: JSON.stringify(body)
    }, options)
  }

  put<TResponse, TBody = unknown>(path: string, body: TBody, options?: RequestOptions): Promise<TResponse> {
    return this.request<TResponse>(this.withMoviesPrefix(path), {
      method: 'PUT',
      body: JSON.stringify(body)
    }, options)
  }

  delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(this.withMoviesPrefix(path), { method: 'DELETE' }, options)
  }

  login<T>(email: string, password: string, proyect: string): Promise<T> {
    void proyect

    return this.post<T, { Email: string; UserName: string; Password: string }>(
      'login',
      { Email: email, UserName: email, Password: password },
      { requiresAuth: false }
    )
  }

  getInfo(): Promise<string> {
    return this.get<string>('info/getInfo')
  }

  checkUser(): Promise<boolean> {
    return this.get<boolean>('checkUser')
  }

  private withMoviesPrefix(path: string): string {
    const normalizedPath = path.startsWith('/') ? path.slice(1) : path

    if (!normalizedPath) {
      return 'api/movies'
    }

    if (normalizedPath === 'api/movies' || normalizedPath.startsWith('api/movies/')) {
      return normalizedPath
    }

    return `api/movies/${normalizedPath}`
  }

  private appendQuery(path: string, query?: QueryParams): string {
    if (!query) {
      return path
    }

    const searchParams = new URLSearchParams()
    for (const [key, value] of Object.entries(query)) {
      searchParams.set(key, String(value))
    }

    const queryString = searchParams.toString()
    if (!queryString) {
      return path
    }

    const separator = path.includes('?') ? '&' : '?'
    return `${path}${separator}${queryString}`
  }
}

export const zetaApiService = new ZetaApiService()