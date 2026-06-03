

// used for sign in with password
const MONKEYTYPE_SIGN_IN_BASE_URL = "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword"
const MONKEYTYPE_GOOGLE_APIS_IDENTITY_TOOLKIT_KEY = "AIzaSyB5m_AnO575kvWriahcF1SFIWp8Fj3gQno"
const MONKEYTYPE_API_BASE_URL = 'https://api.monkeytype.com'
const MONKEYTYPE_GOOGLE_APIS_IDENTITY_TOOLKIT_SEARCH_PARAMS = new URLSearchParams({
  key: MONKEYTYPE_GOOGLE_APIS_IDENTITY_TOOLKIT_KEY,
})

// used for getting a new access token from refresh token
const MONKEYTYPE_SECURE_TOKEN_BASE_URL = "https://securetoken.googleapis.com/v1/token"
const MONKEYTYPE_REFRESH_TOKEN_URL = `${
  MONKEYTYPE_SECURE_TOKEN_BASE_URL
}?${MONKEYTYPE_GOOGLE_APIS_IDENTITY_TOOLKIT_SEARCH_PARAMS.toString()}`

export type MonkeyType = {
  login: Function,
  getPresets: Function,
  getTags: Function,
}

export const headers = new Headers()
headers.append("Referer", "https://monkeytype.com")
headers.append(
  "User-Agent",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
)
headers.append("Content-Type", "application/json")

function getBody(email: string, password: string) {
  return JSON.stringify({
    clientType: "CLIENT_TYPE_WEB",
    email,
    password,
    returnSecureToken: true,
  })
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const requestOptions = {
    body: getBody(email, password),
    headers,
    method: "POST",
  }

  return fetch(
    `${MONKEYTYPE_SIGN_IN_BASE_URL}?${MONKEYTYPE_GOOGLE_APIS_IDENTITY_TOOLKIT_SEARCH_PARAMS.toString()}`,
    requestOptions,
  ).then((response) => response.json())
}

export interface LoginResponse {
  displayName: string
  email: string
  expiresIn: string
  idToken: string
  kind: string
  localId: string
  profilePicture: string
  refreshToken: string
  registered: boolean
}

export interface PresetsResponse {
  data: Preset[]
  message: string
}

export interface Preset {
  _id: string
  config: PresetConfig
  name: string
  settingGroups: unknown
}

export interface PresetConfig {
  accountChart: string[]
  alwaysShowWordsHistory?: boolean
  blindMode?: boolean
  burstHeatmap: boolean
  confidenceMode?: string
  customBackgroundFilter: number[]
  customLayoutfluid: string[]
  customPolyglot: string[]
  customThemeColors: string[]
  difficulty?: string
  favThemes: unknown[]
  fontSize: number
  funbox: unknown[]
  language?: string
  liveAccStyle?: string
  liveBurstStyle?: string
  minAccCustom: number
  mode?: string
  numbers?: boolean
  oppositeShiftMode?: string
  playSoundOnError: string
  punctuation?: boolean
  quickEnd?: boolean
  quickRestart: string
  quoteLength: number[]
  singleListCommandLine: string
  strictSpace?: boolean
  tags: string[]
  theme: string
  time?: number
  timerStyle?: string
  words: number
}

export interface RequestOptions {
  headers: Headers,
  method: string
}

export async function getPresets(requestOptions: RequestOptions): Promise<PresetsResponse> {
  const response = await fetch(`${MONKEYTYPE_API_BASE_URL}/presets`, requestOptions)
  if (response.status >= 400) {
    throw new Error(
      `${response.status} - ${response.statusText}: Try running the "login" command before running this again.`,
    )
  } else {
    return response.json()
  }
}

export async function getTags(requestOptions: RequestOptions): Promise<{data: Tag[]; message: string}> {
  const response = await fetch(`${MONKEYTYPE_API_BASE_URL}/users/tags`, requestOptions)
  if (response.status >= 400) {
    throw new Error(
      `${response.status} - ${response.statusText}: Try running the "login" command before running this again.`,
    )
  } else {
    return response.json()
  }
}

export async function refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
  const myHeaders = new Headers();
  myHeaders.append("Referer", "https://monkeytype.com");
  myHeaders.append(
    "User-Agent",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
  );
  myHeaders.append("Content-Type", "application/x-www-form-urlencoded");

  const urlencoded = new URLSearchParams();
  urlencoded.append("grant_type", "refresh_token");
  urlencoded.append("refresh_token", refreshToken);

  const requestOptions = {
    method: "POST",
    headers: myHeaders,
    body: urlencoded,
    redirect: "follow",
  };

  const response = await fetch(
    MONKEYTYPE_REFRESH_TOKEN_URL,
    requestOptions as RequestInit,
  )
  if (response.status >= 400) {
    throw new Error(
      `${response.status} - ${response.statusText}`,
    )
  } else {
    return response.json()
  }
}

export interface RefreshTokenResponse {
  access_token: string
  expires_in: string
  token_type: string
  refresh_token: string
  id_token: string
  user_id: string
  project_id: string
}

export interface ResultsResponse {
  data: ResultResponse[]
  message: string
}

export interface ResultResponse {
  _id: string
  acc: number
  charStats: number[]
  consistency: number
  difficulty: string
  incompleteTestSeconds: number
  keyConsistency: number
  mode: string
  mode2: string
  numbers: boolean
  punctuation: boolean
  rawWpm: number
  restartCount: number
  tags: string[]
  testDuration: number
  timestamp: number
  uid: string
  wpm: number
}

export async function getResults(offset = 0, limit = 1000, requestOptions: {headers: Headers; method: string}, lastResultTimeStamp: number): Promise<ResultsResponse> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
    onOrAfterTimestamp: String(lastResultTimeStamp + 1), // on or after
  })

  const response = await fetch(
    `${MONKEYTYPE_API_BASE_URL}/results?${params.toString()}`,
    requestOptions,
  )
  if (response.status >= 400) {
    throw new Error(
      `${response.status} - ${response.statusText}: Try running the "login" command before running this again.`,
    )
  } else {
    return response.json()
  }
}

export interface Tag {
  _id: string
  name: string
  personalBests: PersonalBests
}

export interface PersonalBests {
  time: Time
  words: Words
  quote: Quote
  zen: Zen
  custom: Custom
}

export interface Time {}

export interface Words {
  "25": W25[]
}

export interface W25 {
  acc: number
  consistency: number
  difficulty: string
  lazyMode: boolean
  language: string
  punctuation: boolean
  raw: number
  wpm: number
  numbers: boolean
  timestamp: number
}

export interface Quote {}

export interface Zen {}

export interface Custom {}

export const monkeytype = {
  login,
  getPresets,
  getTags,
} satisfies MonkeyType