import Conf from 'conf'
import { logger } from './ui/logger.js'
import { read } from 'read'

export interface Config {
  dbURL?: string
  maintainStreak?: boolean
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
    const expiresIn = Number(this.get('expiresIn'))
    if (Number.isNaN(expiresIn)) return false

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

  async promptMaintainStreak(): Promise<void> {
    // Check whether maintain streak has been set
    let maintainStreak = this.get("maintainStreak")
    if (typeof maintainStreak != 'boolean') {
      try {
        let result = await read({prompt: "Maintain daily typing streak (y/n): ", default: "y", silent: false});
        maintainStreak = result.toLowerCase() !== "y" ? false : true
        this.set("maintainStreak", maintainStreak)
        logger.success(`Successfully set the "maintainStreak" field in your config to ${maintainStreak}!`)
      } catch (error) {
        if ((error as Error).message !== "canceled") {
          logger.error(`An error occurred: ${(error as Error).message}. Please try again.`)
          maintainStreak = false
        }
      }
    }
  }
}

export const config = new CustomConf({projectName: 'typing_goals_cli'})
