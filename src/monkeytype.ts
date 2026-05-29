

// used for sign in with password
const MONKEYTYPE_SIGN_IN_BASE_URL = "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword"
const MONKEYTYPE_GOOGLE_APIS_IDENTITY_TOOLKIT_KEY = "AIzaSyB5m_AnO575kvWriahcF1SFIWp8Fj3gQno"

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

  const MONKEYTYPE_GOOGLE_APIS_IDENTITY_TOOLKIT_SEARCH_PARAMS = new URLSearchParams({
    key: MONKEYTYPE_GOOGLE_APIS_IDENTITY_TOOLKIT_KEY,
  })

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

export const monkeytype = {
  login,
}