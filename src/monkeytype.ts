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
  login: (email: string, password: string) => Promise<LoginResponse | void>,
  getPresets: (requestOptions: RequestOptions) => Promise<PresetsResponse>,
  getTags: (requestOptions: RequestOptions) => Promise<TagsResponse>,
  getResults: (offset: number, limit: number, requestOptions: RequestOptions, lastResultTimestamp: number) => Promise<ResultsResponse>,
  refreshToken: (refreshToken: string) => Promise<RefreshTokenResponse>,
  getProfile: (uid: string, requestOptions: RequestOptions) => Promise<ProfileResponse>,
  getStreak: (requestOptions: RequestOptions) => Promise<StreakResponse>,
}

export const headers = new Headers()
headers.append("Referer", "https://monkeytype.com")
headers.append(
  "User-Agent",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
)
headers.append("Content-Type", "application/json")

export function getBody(email: string, password: string) {
  return JSON.stringify({
    clientType: "CLIENT_TYPE_WEB",
    email,
    password,
    returnSecureToken: true,
  })
}

export async function login(email: string, password: string): Promise<LoginResponse | void> {
  const requestOptions = {
    body: getBody(email, password),
    headers,
    method: "POST",
  }

  const response = await fetch(
    `${MONKEYTYPE_SIGN_IN_BASE_URL}?${MONKEYTYPE_GOOGLE_APIS_IDENTITY_TOOLKIT_SEARCH_PARAMS.toString()}`,
    requestOptions,
  ).then((response) => response.json())

  if (response?.error) {
    throw new Error(`Unable to connect your MonkeyType account to the CLI due to ${response?.error?.message.toLowerCase().replaceAll("_", " ")}. Please try again.`)
  }

  return response
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
  error?: any
}

export interface PresetsResponse {
  data: PresetResponse[]
  message: string
}

export interface PresetResponse {
  _id: string
  config: PresetConfig
  name: string
  settingGroups: unknown
}

export interface PresetConfig {
  punctuation?: boolean
  numbers?: boolean
  words?: number
  time?: number
  mode?: string
  quoteLength?: number[]
  language?: string
  burstHeatmap?: boolean
  difficulty?: string
  quickRestart?: string
  repeatQuotes?: string
  resultSaving?: boolean
  blindMode?: boolean
  alwaysShowWordsHistory?: boolean
  singleListCommandLine?: string
  minWpm?: string
  minWpmCustomSpeed?: number
  minAcc?: string
  minAccCustom?: number
  minBurst?: string
  minBurstCustomSpeed?: number
  britishEnglish?: boolean
  funbox?: any[]
  customLayoutfluid?: string[]
  customPolyglot?: string[]
  freedomMode?: boolean
  strictSpace?: boolean
  oppositeShiftMode?: string
  stopOnError?: string
  confidenceMode?: string
  quickEnd?: boolean
  indicateTypos?: string
  compositionDisplay?: string
  hideExtraLetters?: boolean
  lazyMode?: boolean
  layout?: string
  codeUnindentOnBackspace?: boolean
  soundVolume?: number
  playSoundOnClick?: string
  playSoundOnError?: string
  playTimeWarning?: string
  smoothCaret?: string
  caretStyle?: string
  paceCaret?: string
  paceCaretCustomSpeed?: number
  paceCaretStyle?: string
  repeatedPace?: boolean
  timerStyle?: string
  liveSpeedStyle?: string
  liveAccStyle?: string
  liveBurstStyle?: string
  timerColor?: string
  timerOpacity?: string
  highlightMode?: string
  typedEffect?: string
  tapeMode?: string
  tapeMargin?: number
  smoothLineScroll?: boolean
  showAllLines?: boolean
  alwaysShowDecimalPlaces?: boolean
  typingSpeedUnit?: string
  startGraphsAtZero?: boolean
  maxLineWidth?: number
  fontSize?: number
  fontFamily?: string
  keymapMode?: string
  keymapLayout?: string
  keymapStyle?: string
  keymapLegendStyle?: string
  keymapShowTopRow?: string
  keymapSize?: number
  flipTestColors?: boolean
  colorfulMode?: boolean
  customBackground?: string
  customBackgroundSize?: string
  customBackgroundFilter?: number[]
  autoSwitchTheme?: boolean
  themeLight?: string
  themeDark?: string
  randomTheme?: string
  favThemes?: any[]
  theme?: string
  customTheme?: boolean
  customThemeColors?: string[]
  showKeyTips?: boolean
  showOutOfFocusWarning?: boolean
  capsLockWarning?: boolean
  showAverage?: string
  showPb?: boolean
  accountChart?: string[]
  monkey?: boolean
  monkeyPowerLevel?: string
  ads?: string
  tags?: string[]
}

export const emojiForPresetConfigOption: Record<string, any> = {
  blindMode: `🙈 blind`,
  confidenceMode: `⌫ confidence`,
  oppositeShiftMode: `⇆ opposite shift`,
  minAccCustom: `💣 min % acc`,
  minBurstCustomSpeed: `💣 min wpm burst`,
  minWpmCustomSpeed: `💣 min wpm`,
  difficulty: {
    master: `⭐`,
    expert: `✨`,
  },
  language: `🌎 lang`
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

export async function getTags(requestOptions: RequestOptions): Promise<TagsResponse> {
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
    requestOptions as RequestOptions,
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

export async function getResults(offset = 0, limit = 1000, requestOptions: RequestOptions, lastResultTimestamp: number): Promise<ResultsResponse> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
    onOrAfterTimestamp: String(lastResultTimestamp + 1), // on or after
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

export interface ProfileResponse {
  message: string
  data: Profile
}

export interface Profile {
  name: string
  addedAt: number
  typingStats: TypingStats
  personalBests: ProfilePersonalBests
  discordId: string
  discordAvatar: string
  xp: number
  streak: number
  maxStreak: number
  isPremium: boolean
  details: ProfileDetails
  allTimeLbs: AllTimeLbs
  uid: string
}

export interface TypingStats {
  completedTests: number
  startedTests: number
  timeTyping: number
}

export interface ProfilePersonalBests {
  time: Time
  words: Words
}

export interface Time {
  "15": TestResult[]
  "30": TestResult[]
  "60": TestResult[]
  "120": TestResult[]
}

export interface Words {
  "10": TestResult[]
  "25": TestResult[]
  "50": TestResult[]
  "100": TestResult[]
}

export interface TestResult {
  acc: number
  consistency: number
  difficulty: string
  lazyMode: boolean
  language: string
  punctuation: boolean
  raw: number
  wpm: number
  timestamp: number
  numbers?: boolean
}

export interface ProfileDetails {
  bio: string
  keyboard: string
  socialProfiles: SocialProfiles
  showActivityOnPublicProfile: boolean
}

export interface SocialProfiles {
  github: string
  twitter: string
  website: string
}

export interface AllTimeLbs {
  time: Record<string, Record<string, { rank: number; count: number }>>
}

export async function getProfile(uid: string, requestOptions: RequestOptions): Promise<ProfileResponse> {
  const params = new URLSearchParams({
    isUid: String(true),
  })

  const response = await fetch(
    `${MONKEYTYPE_API_BASE_URL}/users/${uid}/profile?${params.toString()}`,
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

export interface StreakResponse {
  message: string
  data?: {
    lastResultTimestamp: number,
    length: number
    maxLength: number
    hourOffset: number | null
  }
}

export async function getStreak(requestOptions: RequestOptions): Promise<StreakResponse> {
  const response = await fetch(
    `${MONKEYTYPE_API_BASE_URL}/users/streak`,
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

export interface TagsResponse {
  data: TagResponse[]
  message: string
}

export interface TagResponse {
  _id: string
  name: string
  personalBests: PersonalBests
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

export type PersonalBests = Record<string, Record<string, W25[]>>

export function getFieldsFromConfig(config: PresetConfig | undefined, personalBests: Record<string, Record<string, W25[]>> | undefined): { pb: W25 | undefined; mode: string | undefined; mode2: string | undefined } {
  const mode = config?.mode || (config?.words !== 0 ? "words" : config?.time !== 0 ? "time" : undefined);
  const mode2 = String(config?.words || config?.time || "") || undefined;
  const pb = (mode && mode2) ? personalBests?.[mode]?.[mode2]?.[0] : undefined;
  return { pb, mode, mode2 };
}

export const monkeytype = {
  login,
  getPresets,
  getTags,
  getResults,
  refreshToken,
  getProfile,
  getStreak,
} satisfies MonkeyType