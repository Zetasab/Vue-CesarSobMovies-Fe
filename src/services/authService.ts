import { sessionStorageService, type AuthSession } from './sessionStorageService'
import { zetaApiService } from './zetaApiService'

interface LoginApiResponse {
  token?: string
  accessToken?: string
  jwt?: string
  username?: string
  email?: string
  profileImg?: string
  user?: unknown
}

interface LoginUserInfo {
  profileImg?: string
}

class AuthService {
  private lastLoginErrorMessage: string | null = null

  getLastLoginErrorMessage(): string | null {
    return this.lastLoginErrorMessage
  }

  async login(email: string, password: string, proyect: string): Promise<boolean> {
    this.lastLoginErrorMessage = null

    try {
      const response = await zetaApiService.login<LoginApiResponse>(email, password, proyect)
      const token = response.token ?? response.accessToken ?? response.jwt

      if (!token) {
        this.lastLoginErrorMessage = 'No se recibió un token válido en el login.'
        return false
      }

      const session: AuthSession = {
        username: response.username ?? response.email ?? email,
        token,
        loggedInAt: new Date().toISOString(),
        profileImg: response.profileImg ?? (response.user as LoginUserInfo | undefined)?.profileImg,
        user: response.user
      }

      sessionStorageService.saveAuthSession(session)

      const isValidUser = await zetaApiService.checkUser()
      if (!isValidUser) {
        this.logout()
        this.lastLoginErrorMessage = 'Usuario no autorizado.'
        return false
      }

      return true
    } catch (error) {
      this.lastLoginErrorMessage = this.extractErrorMessage(error) ?? 'Credenciales incorrectas'
      this.logout()
      return false
    }
  }

  logout(): void {
    sessionStorageService.clearAuthSession()
  }

  getSession(): AuthSession | null {
    return sessionStorageService.getAuthSession()
  }

  getToken(): string | null {
    return this.getSession()?.token ?? null
  }

  saveRememberedUsername(username: string): void {
    sessionStorageService.saveRememberedUsername(username)
  }

  getRememberedUsername(): string | null {
    return sessionStorageService.getRememberedUsername()
  }

  clearRememberedUsername(): void {
    sessionStorageService.clearRememberedUsername()
  }

  saveRememberedPassword(password: string): void {
    sessionStorageService.saveRememberedPassword(password)
  }

  getRememberedPassword(): string | null {
    return sessionStorageService.getRememberedPassword()
  }

  clearRememberedPassword(): void {
    sessionStorageService.clearRememberedPassword()
  }

  isAuthenticated(): boolean {
    return this.getToken() !== null
  }

  async checkLogin(): Promise<boolean> {
    if (!this.getToken()) {
      return false
    }

    try {
      const isValidUser = await zetaApiService.checkUser()

      if (!isValidUser) {
        this.logout()
      }

      return isValidUser
    } catch {
      this.logout()
      return false
    }
  }

  private extractErrorMessage(error: unknown): string | null {
    if (!error) {
      return null
    }

    if (typeof error === 'object' && 'payload' in error) {
      const payload = (error as { payload?: unknown }).payload
      if (typeof payload === 'object' && payload && 'message' in payload) {
        const payloadMessage = (payload as { message?: unknown }).message
        if (typeof payloadMessage === 'string' && payloadMessage.trim()) {
          return payloadMessage
        }
      }
    }

    if (typeof error === 'object' && error && 'message' in error) {
      const errorMessage = (error as { message?: unknown }).message
      if (typeof errorMessage === 'string' && errorMessage.trim()) {
        return errorMessage
      }
    }

    return null
  }
}

export const authService = new AuthService()