import { describe, test, vi, expect } from "vitest";
import { setConfig, isTokenValid, createRequestOptions, expireTokens } from "./config.js";

describe("Config", () => {
  test.each([
    { idToken: "xxxxxx", method: "GET", authorization: "bearerAuth", expected: "Bearer xxxxxx" },
    { idToken: "xxxxxx", method: "GET", expected: "Bearer xxxxxx" },
    { apiKey: "yyyyyy", method: "GET", authorization: "key", expected: "ApeKey yyyyyy" },
  ])
  ('createRequestOptions(config, $method, $authorization) -> $expected', ({method, authorization, idToken, apiKey, expected}) => {
    const config = new Map([
      ["idToken", idToken],
      ["apiKey", apiKey],
    ])
    
    // @ts-ignore
    const options = createRequestOptions(config, method, authorization);

    expect(options.headers.get("Authorization")).toBe(expected);
  });

  test.each([
    { idToken: "xxxxxx", expiresIn: "72387", refreshToken: "dsfu9hu349r87sdjhlkj", expected: undefined },
  ])
  ('expireTokens(config) -> $expected', ({ idToken, expiresIn, refreshToken, expected}) => {
    const config = new Map([
      ["idToken", idToken],
      ["expiresIn", expiresIn],
      ["refreshToken", refreshToken],
    ])
    
    // @ts-ignore
    expireTokens(config);

    expect(config.get("expiresIn")).toBe(expected);
    expect(config.get("idToken")).toBe(expected);
    expect(config.get("refreshToken")).toBe(expected);
  });

  test.each([
    { expiresIn: String(Date.now() + 8000), expected: true },
    { expiresIn: String(Date.now() - 8000), expected: false },
    { expected: false },
  ])
  ('isTokenValid(config) -> $expected', ({ expiresIn, expected}) => {
    const config = new Map([
      ["expiresIn", expiresIn],
    ])
    
    // @ts-ignore
    const result = isTokenValid(config);

    expect(result).toBe(expected);
  });

  test.each([
    { idToken: "xxxxxx", expiresIn: "72387", refreshToken: "dsfu9hu349r87sdjhlkj", expectedExpiresIn: 1328202387000 },
  ])
  ('setConfig(config) -> $expectedExpiresIn', ({ idToken, expiresIn, refreshToken, expectedExpiresIn}) => {
    const date = new Date(2012, 1, 1, 13);
    vi.setSystemTime(date);

    const config = new Map([
      ["idToken", "oldIdToken"],
      ["expiresIn", "oldExpiresIn"],
      ["refreshToken", "oldRefreshToken"],
    ])

    const obj = {
      idToken,
      expiresIn,
      refreshToken,
    }
    
    // @ts-ignore
    setConfig(obj, config);

    expect(config.get("expiresIn")).toBe(expectedExpiresIn);
    expect(config.get("idToken")).toBe(idToken);
    expect(config.get("refreshToken")).toBe(refreshToken);
  });
});

