import { sessionStorageService, type AuthSession } from './sessionStorageService'
import { zetaApiService } from './zetaApiService'

interface LoginApiResponse {
  token?: string
  accessToken?: string
  jwt?: string
  username?: string
  profileImg?: string
  user?: unknown
}

interface LoginUserInfo {
  profileImg?: string
}

class AuthService {
  async login(username: string, password: string, proyect: string): Promise<boolean> {
    try {
      const response = await zetaApiService.login<LoginApiResponse>(username, password, proyect)
      const token = response.token ?? response.accessToken ?? response.jwt

      if (!token) {
        return false
      }

      const session: AuthSession = {
        username: response.username ?? username,
        token,
        loggedInAt: new Date().toISOString(),
        profileImg: response.profileImg ?? (response.user as LoginUserInfo | undefined)?.profileImg,
        user: response.user
      }

      sessionStorageService.saveAuthSession(session)

      return true
    } catch {
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
}

export const authService = new AuthService()