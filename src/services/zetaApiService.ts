import { BaseApiService } from './baseApiService'
import { sessionStorageService } from './sessionStorageService'

const DEV_BASE_URL = 'http://localhost:5051/'
const PROD_BASE_URL = 'https://zetaapi.up.railway.app/'

const baseUrl = import.meta.env.VITE_ZETA_API_BASE_URL ?? (import.meta.env.DEV ? DEV_BASE_URL : PROD_BASE_URL)

class ZetaApiService extends BaseApiService {
  constructor() {
    super(baseUrl, () => sessionStorageService.getAuthSession()?.token ?? null)
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'GET' })
  }

  post<TResponse, TBody = unknown>(path: string, body: TBody): Promise<TResponse> {
    return this.request<TResponse>(path, {
      method: 'POST',
      body: JSON.stringify(body)
    })
  }

  put<TResponse, TBody = unknown>(path: string, body: TBody): Promise<TResponse> {
    return this.request<TResponse>(path, {
      method: 'PUT',
      body: JSON.stringify(body)
    })
  }

  delete<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'DELETE' })
  }

  login<T>(username: string, password: string, proyect: string): Promise<T> {
    return this.request<T>(
      `/user/login?proyect=${encodeURIComponent(proyect)}`,
      {
        method: 'POST',
        body: JSON.stringify({ UserName: username, Password: password })
      },
      { requiresAuth: false }
    )
  }

  getInfo(): Promise<string> {
    return this.get<string>('/info/getInfo')
  }

  getMoviesApi(): Promise<string> {
    return this.get<string>('/info/getMoviesApi')
  }

  checkUser(): Promise<boolean> {
    return this.get<boolean>('/user/checkUser')
  }
}

export const zetaApiService = new ZetaApiService()