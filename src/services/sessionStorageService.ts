const AUTH_SESSION_KEY = 'movie-auth-session'
const TMDB_API_KEY_STORAGE_KEY = 'movie-tmdb-api-key'
const REMEMBERED_USERNAME_STORAGE_KEY = 'movie-remembered-username'
const REMEMBERED_PASSWORD_STORAGE_KEY = 'movie-remembered-password'

export interface AuthSession {
  username: string
  token: string
  loggedInAt: string
  profileImg?: string
  user?: unknown
}

function parseJson<T>(rawValue: string | null): T | null {
  if (!rawValue) {
    return null
  }

  try {
    return JSON.parse(rawValue) as T
  } catch {
    return null
  }
}

class SessionStorageService {
  private canUseStorage(): boolean {
    return typeof window !== 'undefined'
  }

  private readStorageValue(key: string): string | null {
    if (!this.canUseStorage()) {
      return null
    }

    const localValue = localStorage.getItem(key)
    if (localValue) {
      return localValue
    }

    return sessionStorage.getItem(key)
  }

  private migrateSessionValueToLocalStorage(key: string): void {
    if (!this.canUseStorage()) {
      return
    }

    const sessionValue = sessionStorage.getItem(key)
    if (!sessionValue) {
      return
    }

    localStorage.setItem(key, sessionValue)
    sessionStorage.removeItem(key)
  }

  saveAuthSession(session: AuthSession): void {
    if (!this.canUseStorage()) {
      return
    }

    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session))
    sessionStorage.removeItem(AUTH_SESSION_KEY)
  }

  getAuthSession(): AuthSession | null {
    if (!this.canUseStorage()) {
      return null
    }

    this.migrateSessionValueToLocalStorage(AUTH_SESSION_KEY)

    const session = parseJson<AuthSession>(this.readStorageValue(AUTH_SESSION_KEY))
    if (!session?.token) {
      return null
    }

    return session
  }

  clearAuthSession(): void {
    if (!this.canUseStorage()) {
      return
    }

    localStorage.removeItem(AUTH_SESSION_KEY)
    sessionStorage.removeItem(AUTH_SESSION_KEY)
  }

  saveTmdbApiKey(apiKey: string): void {
    if (!this.canUseStorage()) {
      return
    }

    localStorage.setItem(TMDB_API_KEY_STORAGE_KEY, apiKey)
    sessionStorage.removeItem(TMDB_API_KEY_STORAGE_KEY)
  }

  getTmdbApiKey(): string | null {
    if (!this.canUseStorage()) {
      return null
    }

    this.migrateSessionValueToLocalStorage(TMDB_API_KEY_STORAGE_KEY)

    return this.readStorageValue(TMDB_API_KEY_STORAGE_KEY)
  }

  clearTmdbApiKey(): void {
    if (!this.canUseStorage()) {
      return
    }

    localStorage.removeItem(TMDB_API_KEY_STORAGE_KEY)
    sessionStorage.removeItem(TMDB_API_KEY_STORAGE_KEY)
  }

  saveRememberedUsername(username: string): void {
    if (!this.canUseStorage()) {
      return
    }

    localStorage.setItem(REMEMBERED_USERNAME_STORAGE_KEY, username)
  }

  getRememberedUsername(): string | null {
    if (!this.canUseStorage()) {
      return null
    }

    return localStorage.getItem(REMEMBERED_USERNAME_STORAGE_KEY)
  }

  clearRememberedUsername(): void {
    if (!this.canUseStorage()) {
      return
    }

    localStorage.removeItem(REMEMBERED_USERNAME_STORAGE_KEY)
  }

  saveRememberedPassword(password: string): void {
    if (!this.canUseStorage()) {
      return
    }

    localStorage.setItem(REMEMBERED_PASSWORD_STORAGE_KEY, password)
  }

  getRememberedPassword(): string | null {
    if (!this.canUseStorage()) {
      return null
    }

    return localStorage.getItem(REMEMBERED_PASSWORD_STORAGE_KEY)
  }

  clearRememberedPassword(): void {
    if (!this.canUseStorage()) {
      return
    }

    localStorage.removeItem(REMEMBERED_PASSWORD_STORAGE_KEY)
  }
}

export const sessionStorageService = new SessionStorageService()