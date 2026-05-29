import Conf from 'conf'

export interface Config {
  displayName?: string
  email?: string
  expiresIn?: string
  idToken?: string
  localId?: string
  profilePicture?: string
  projectName: string
  refreshToken?: string
}

export const config = new Conf({projectName: 'typing_goals_cli'}) satisfies Conf

export function setConfig(obj: Record<string, any>, config: Conf) {
  for (const [key, value] of Object.entries(obj)) {
    if (key === 'expiresIn') {
      config.set(key, Date.now() + Number(Number(value) * 1000))
    } else {
      config.set(key, value)
    }
  }
}

export function isTokenValid(config: Conf) {
  const expiresIn = Number(config.get('expiresIn') || 0)
  if (!expiresIn) return false

  return Date.now() < expiresIn
}

export function expireToken(config: Conf) {
  config.delete('expiresIn')
}

export function createRequestOptions(
  config: Conf,
  method: string,
  authorization = 'bearerAuth',
): {headers: Headers; method: string} {
  const headers = new Headers()
  const authorizationValue = authorization === 'bearerAuth' ? `Bearer ${config.get('idToken')}` : `ApeKey ${config.get('apiKey')}`

  headers.append('Authorization', authorizationValue)

  return {
    headers,
    method,
  }
}