import { zetaApiService } from './zetaApiService'

interface RegisterRequest {
  Email: string
  UserName: string
  Password: string
}

interface VerifyEmailRequest {
  Email: string
  Code: string
}

interface MessageResponse {
  message?: string
}

class UserRegistrationService {
  async register(email: string, username: string, password: string): Promise<MessageResponse> {
    return zetaApiService.post<MessageResponse, RegisterRequest>(
      'register',
      {
        Email: email,
        UserName: username,
        Password: password
      },
      { requiresAuth: false }
    )
  }

  async verifyEmail(email: string, code: string): Promise<MessageResponse> {
    return zetaApiService.post<MessageResponse, VerifyEmailRequest>(
      'verify-email',
      {
        Email: email,
        Code: code
      },
      { requiresAuth: false }
    )
  }
}

export const userRegistrationService = new UserRegistrationService()
