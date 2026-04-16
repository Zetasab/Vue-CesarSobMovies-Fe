import { sessionStorageService } from './sessionStorageService'

type GenericObject = Record<string, unknown>

function decodeJwtPayload(token: string): GenericObject | null {
  const tokenParts = token.split('.')
  const rawPayload = tokenParts[1]
  if (!rawPayload) {
    return null
  }

  try {
    const normalizedPayload = rawPayload.replace(/-/g, '+').replace(/_/g, '/')
    const paddedPayload = normalizedPayload.padEnd(Math.ceil(normalizedPayload.length / 4) * 4, '=')
    const decoded = atob(paddedPayload)
    return JSON.parse(decoded) as GenericObject
  } catch {
    return null
  }
}

function readClaim(payload: GenericObject | null, keys: string[]): string {
  if (!payload) {
    return ''
  }

  for (const key of keys) {
    const rawValue = payload[key]
    if (typeof rawValue === 'string' && rawValue.trim()) {
      return rawValue.trim()
    }
  }

  return ''
}

function readUserIdFromUser(user: GenericObject | null): string {
  if (!user) {
    return ''
  }

  const userIdKeys = ['id', 'Id', '_id', 'userId', 'UserId', 'sub', 'nameid']

  for (const key of userIdKeys) {
    const rawValue = user[key]
    if (typeof rawValue === 'string' && rawValue.trim()) {
      return rawValue.trim()
    }

    if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
      return String(rawValue)
    }
  }

  return ''
}

function readUserRoleFromUser(user: GenericObject | null): string {
  if (!user) {
    return ''
  }

  const directRoleKeys = ['role', 'Role']
  for (const key of directRoleKeys) {
    const rawValue = user[key]
    if (typeof rawValue === 'string' && rawValue.trim()) {
      return rawValue.trim()
    }
  }

  const roles = user.roles
  if (Array.isArray(roles)) {
    const firstRole = roles.find((role) => typeof role === 'string' && role.trim())
    if (typeof firstRole === 'string' && firstRole.trim()) {
      return firstRole.trim()
    }
  }

  return ''
}

export function getCurrentUserRequestHeaders(): Record<string, string> {
  const session = sessionStorageService.getAuthSession()
  if (!session) {
    return {}
  }

  const user = (session.user as GenericObject | undefined) ?? null
  const tokenPayload = decodeJwtPayload(session.token)

  const userIdFromToken = readClaim(tokenPayload, [
    'nameid',
    'sub',
    'userId',
    'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'
  ])

  const roleFromToken = readClaim(tokenPayload, [
    'role',
    'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'
  ])

  const userId = readUserIdFromUser(user) || userIdFromToken || session.username
  const role = session.role?.trim() || readUserRoleFromUser(user) || roleFromToken || 'User'

  if (!userId) {
    return {}
  }

  return {
    'X-User-Id': userId,
    'X-User-Role': role
  }
}
