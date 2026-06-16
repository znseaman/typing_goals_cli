import Conf from 'conf'

export interface Config {
  dbURL?: string
  displayName?: string
  email?: string
  expiresIn?: string
  idToken?: string
  localId?: string
  profilePicture?: string
  projectName: string
  refreshToken?: string
}

export class CustomConf extends Conf {
  constructor(partialOptions? : any) {
    super(partialOptions)
  }

  setConfig(obj: Record<string, any>) {
    for (const [key, value] of Object.entries(obj)) {
      if (key === 'expiresIn') {
        this.set(key, Date.now() + Number(Number(value) * 1000))
      } else {
        if (!value) {
          this.delete(key)
        } else {
          this.set(key, value)
        }
      }
    }
  }

  isTokenValid() {
    const expiresIn = Number(this.get('expiresIn') || 0)
    if (!expiresIn) return false

    return Date.now() < expiresIn
  }

  expireTokens() {
    this.delete('expiresIn')
    this.delete('idToken')
    this.delete('refreshToken')
  }

  createRequestOptions(
    method: string,
    authorization = 'bearerAuth',
  ): {headers: Headers; method: string} {
    const headers = new Headers()
    const authorizationValue = authorization === 'bearerAuth' ? `Bearer ${this.get('idToken')}` : `ApeKey ${this.get('apiKey')}`

    headers.append('Authorization', authorizationValue)

    return {
      headers,
      method,
    }
  }
}

export const config = new CustomConf({projectName: 'typing_goals_cli'})
