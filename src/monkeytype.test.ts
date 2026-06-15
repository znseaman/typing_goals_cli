import { describe, test, vi, expect } from "vitest";
import { getBody, getPresets, getResults, getTags, login, refreshToken } from "./monkeytype.js";

describe("getBody", () => {
  test.each([
    { email: "bob@example.com", password: "password", expected: `{"clientType":"CLIENT_TYPE_WEB","email":"bob@example.com","password":"password","returnSecureToken":true}`  },
    { email: "example@example.com", password: "password2", expected: `{"clientType":"CLIENT_TYPE_WEB","email":"example@example.com","password":"password2","returnSecureToken":true}` },
  ])
  ('getBody($email, $password) -> $expected', ({email, password, expected}) => {
    expect(getBody(email, password)).toBe(
      expected
    )
  })
})

describe("login", () => {
  test.each([
    { email: "bob@example.com", password: "password", expected: {displayName: "Bob", email: "bob@example.com", expiresIn: "41324", idToken: "dhdsuhf328dds89hjsvdjh", kind: "key", localId: "userId1", profilePicture: "bob.png", refreshToken: "98dhcsd9jijdlksdjlk", registered: true } },
  ])
  ('login($email, $password) -> $expected', async ({email, password, expected}) => {

    // Here we tell Vitest to mock fetch on the `window` object.
    // @ts-ignore
    global.fetch = vi.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve(expected),
      }),
    );

    // Call the function and assert the result
    const data = await login(email, password);
    expect(data).toEqual(expected);

    // Check that fetch was called exactly once
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyB5m_AnO575kvWriahcF1SFIWp8Fj3gQno",
      expect.anything()
    )
  })
})

describe("getPresets", () => {
  test.each([
    { status: 200, statusText: "OK", expected: { data: [], message: "Presets" } },
    { status: 403, statusText: "Restricted", expected: `403 - Restricted: Try running the "login" command before running this again.` },
  ])
  ('getPresets() -> $expected', async ({ status, statusText, expected }) => {

    // Here we tell Vitest to mock fetch on the `window` object.
    // @ts-ignore
    global.fetch = vi.fn(() =>
      Promise.resolve({
        status: () => Promise.resolve(status),
        statusText: () => Promise.resolve(statusText),
        json: () => Promise.resolve(expected),
      }),
    );

    const requestOptions = {
      headers: new Headers({
        Authorization: "Bearer xxxxxxxxx"
      }),
      method: "GET"
    }

    if (status >= 400) {
      try {
        await getPresets(requestOptions)
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toBe(expected)
      }

      // Check that fetch was called exactly once
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenNthCalledWith(
        1,
        "https://api.monkeytype.com/presets",
        expect.anything()
      )
    } else {
      // Call the function and assert the result
      const data = await getPresets(requestOptions);
      expect(data).toEqual(expected);

      // Check that fetch was called exactly once
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenNthCalledWith(
        1,
        "https://api.monkeytype.com/presets",
        expect.anything()
      )
    }
  })
})

describe("getTags", () => {
  test.each([
    { status: 200, statusText: "OK", expected: { data: [], message: "Tags" } },
    { status: 403, statusText: "Restricted", expected: `403 - Restricted: Try running the "login" command before running this again.` },
  ])
  ('getTags() -> $expected', async ({ status, statusText, expected }) => {

    // Here we tell Vitest to mock fetch on the `window` object.
    // @ts-ignore
    global.fetch = vi.fn(() =>
      Promise.resolve({
        status: () => Promise.resolve(status),
        statusText: () => Promise.resolve(statusText),
        json: () => Promise.resolve(expected),
      }),
    );

    const requestOptions = {
      headers: new Headers({
        Authorization: "Bearer xxxxxxxxx"
      }),
      method: "GET"
    }

    if (status >= 400) {
      try {
        await getTags(requestOptions)
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toBe(expected)
      }

      // Check that fetch was called exactly once
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenNthCalledWith(
        1,
        "https://api.monkeytype.com/users/tags",
        expect.anything()
      )
    } else {
      // Call the function and assert the result
      const data = await getTags(requestOptions);
      expect(data).toEqual(expected);

      // Check that fetch was called exactly once
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenNthCalledWith(
        1,
        "https://api.monkeytype.com/users/tags",
        expect.anything()
      )
    }
  })
})

describe("getResults", () => {
  test.each([
    { offset: 0, limit: 1000, lastResultTimeStamp: 1781390759064, status: 200, statusText: "OK", expected: { data: [], message: "Results" } },
    { offset: 0, limit: 1000, lastResultTimeStamp: 1781390759065, status: 403, statusText: "Restricted", expected: `403 - Restricted: Try running the "login" command before running this again.` },
  ])
  ('getResults($offset, $limit, requestOptions) -> $expected', async ({ offset, limit, lastResultTimeStamp, status, statusText, expected }) => {

    // Here we tell Vitest to mock fetch on the `window` object.
    // @ts-ignore
    global.fetch = vi.fn(() =>
      Promise.resolve({
        status: () => Promise.resolve(status),
        statusText: () => Promise.resolve(statusText),
        json: () => Promise.resolve(expected),
      }),
    );

    const requestOptions = {
      headers: new Headers({
        Authorization: "Bearer xxxxxxxxx"
      }),
      method: "GET"
    }

    if (status >= 400) {
      try {
        await getResults(offset, limit, requestOptions, lastResultTimeStamp)
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toBe(expected)
      }

      // Check that fetch was called exactly once
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenNthCalledWith(
        1,
        `https://api.monkeytype.com/results?limit=${limit}&offset=${offset}&onOrAfterTimestamp=${lastResultTimeStamp + 1}`,
        expect.anything()
      )
    } else {
      // Call the function and assert the result
      const data = await getResults(offset, limit, requestOptions, lastResultTimeStamp)
      expect(data).toEqual(expected);

      // Check that fetch was called exactly once
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenNthCalledWith(
        1,
        `https://api.monkeytype.com/results?limit=${limit}&offset=${offset}&onOrAfterTimestamp=${lastResultTimeStamp + 1}`,
        expect.anything()
      )
    }
  })
})

describe("refreshToken", () => {
  test.each([
    { token: "jniejwhf98ud9sfjlkdsf", status: 200, statusText: "OK", expected: { access_token: "alsdkfjsladkfj", expires_in: "63762", token_type: "refresh", refresh_token: "874923jhhkwejrhuiu23y", id_token: "sdkjafhkjh89382987dsfiul", user_id: "userId1", project_id: "oiweofnkjndsfk83984u98ukdfhdlk" } },
    { token: "jniejwhf98ud9sfjlkdsf", status: 403, statusText: "Restricted", expected: `403 - Restricted: Try running the "login" command before running this again.` },
  ])
  ('refreshToken($refreshToken) -> $expected', async ({ token, status, statusText, expected }) => {

    // Here we tell Vitest to mock fetch on the `window` object.
    // @ts-ignore
    global.fetch = vi.fn(() =>
      Promise.resolve({
        status: () => Promise.resolve(status),
        statusText: () => Promise.resolve(statusText),
        json: () => Promise.resolve(expected),
      }),
    );

    const requestOptions = {
      headers: new Headers({
        Authorization: "Bearer xxxxxxxxx"
      }),
      method: "GET"
    }

    if (status >= 400) {
      try {
        await refreshToken(token)
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toBe(expected)
      }

      // Check that fetch was called exactly once
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenNthCalledWith(
        1,
        `https://securetoken.googleapis.com/v1/token?key=AIzaSyB5m_AnO575kvWriahcF1SFIWp8Fj3gQno`,
        expect.anything()
      )
    } else {
      // Call the function and assert the result
      const data = await refreshToken(token)
      expect(data).toEqual(expected);

      // Check that fetch was called exactly once
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenNthCalledWith(
        1,
        `https://securetoken.googleapis.com/v1/token?key=AIzaSyB5m_AnO575kvWriahcF1SFIWp8Fj3gQno`,
        expect.anything()
      )
    }
  })
})
