interface RequestOptions {
  requiresAuth?: boolean
}

export class ApiError extends Error {
  status: number
  payload: unknown

  constructor(message: string, status: number, payload: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}

export class BaseApiService {
  private static onUnauthorized: (() => void) | null = null
  private readonly baseUrl: string
  private readonly getToken: () => string | null

  static setUnauthorizedHandler(handler: (() => void) | null): void {
    BaseApiService.onUnauthorized = handler
  }

  constructor(baseUrl: string, getToken?: () => string | null) {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
    this.getToken = getToken ?? (() => null)
  }

  protected async request<T>(
    path: string,
    init?: RequestInit,
    options?: RequestOptions
  ): Promise<T> {
    const requiresAuth = options?.requiresAuth ?? true
    const headers = new Headers(init?.headers)

    if (!headers.has('Content-Type') && init?.body) {
      headers.set('Content-Type', 'application/json')
    }

    if (requiresAuth) {
      const token = this.getToken()
      if (token) {
        headers.set('Authorization', `Bearer ${token}`)
      }
    }

    const normalizedPath = path.startsWith('/') ? path.slice(1) : path
    const response = await fetch(`${this.baseUrl}${normalizedPath}`, {
      ...init,
      headers
    })

    const payload = await this.readPayload(response)
    if (requiresAuth && response.status === 401) {
      BaseApiService.onUnauthorized?.()
    }

    if (response.status !== 200) {
      console.error('API request returned non-200 status', {
        url: `${this.baseUrl}${normalizedPath}`,
        method: init?.method ?? 'GET',
        status: response.status,
        statusText: response.statusText,
        payload
      })
    }

    if (!response.ok) {
      throw new ApiError(response.statusText || 'Request failed', response.status, payload)
    }

    return payload as T
  }

  private async readPayload(response: Response): Promise<unknown> {
    const contentType = response.headers.get('content-type') ?? ''

    if (contentType.includes('application/json')) {
      return response.json()
    }

    return response.text()
  }
}