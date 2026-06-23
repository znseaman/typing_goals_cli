import { describe, test, vi, expect } from "vitest";
import { CustomConf } from "./config.js";

describe("Config", () => {
  test.each([
    { idToken: "xxxxxx", method: "GET", authorization: "bearerAuth", expected: "Bearer xxxxxx" },
    { idToken: "xxxxxx", method: "GET", expected: "Bearer xxxxxx" },
    { apiKey: "yyyyyy", method: "GET", authorization: "key", expected: "ApeKey yyyyyy" },
  ])
  ("createRequestOptions(config, $method, $authorization) -> $expected", ({method, authorization, idToken, apiKey, expected}) => {
    const config = new CustomConf({projectName: "test"})
    config.setConfig({
      "idToken": idToken,
      "apiKey": apiKey,
    })
    
    // @ts-ignore
    const options = config.createRequestOptions(method, authorization);

    expect(options.headers.get("Authorization")).toBe(expected);
  });

  test.each([
    { idToken: "xxxxxx", expiresIn: "72387", refreshToken: "dsfu9hu349r87sdjhlkj", expected: undefined },
  ])
  ("expireTokens(config) -> $expected", ({ idToken, expiresIn, refreshToken, expected}) => {
    const config = new CustomConf({projectName: "test"})
    config.set("idToken", idToken)
    config.set("refreshToken", refreshToken)
    config.setConfig({"expiresIn": expiresIn})
    const deleteSpy = vi.spyOn(config, "delete")
    
    // @ts-ignore
    config.expireTokens(config);

    expect(deleteSpy).toHaveBeenNthCalledWith(1, "expiresIn")
    expect(deleteSpy).toHaveBeenNthCalledWith(2, "idToken")
    expect(deleteSpy).toHaveBeenNthCalledWith(3, "refreshToken")
  });

  test.each([
    { expiresIn: String(Date.now() + 8000), expected: true },
    { expiresIn: String(Date.now() - 8000), expected: false },
    { expiresIn: String(0), expected: false },
    { expected: false },
  ])
  ("isTokenValid(config) -> $expected", ({ expiresIn, expected}) => {
    const config = new CustomConf({projectName: "test"})
    const getSpy = vi.spyOn(config, "get")
    config.set({"expiresIn": String(expiresIn)})
    
    // @ts-ignore
    const result = config.isTokenValid();

    expect(result).toBe(expected);
    expect(getSpy).toHaveBeenNthCalledWith(1, "expiresIn")
    getSpy.mockRestore()
  });

  test.each([
    { idToken: "xxxxxx", expiresIn: "72387", refreshToken: "dsfu9hu349r87sdjhlkj", expectedExpiresIn: 1328202387000 },
  ])
  ("setConfig(config) -> $expectedExpiresIn", ({ idToken, expiresIn, refreshToken, expectedExpiresIn}) => {
    const config = new CustomConf({projectName: "test"})
    const setSpy = vi.spyOn(config, "set")

    const date = new Date(2012, 1, 1, 13);
    vi.setSystemTime(date);

    const obj = {
      idToken,
      expiresIn,
      refreshToken,
    }
    
    // @ts-ignore
    config.setConfig(obj, config);

    expect(setSpy).toHaveBeenNthCalledWith(1, "idToken", idToken)
    expect(setSpy).toHaveBeenNthCalledWith(2, "expiresIn", expectedExpiresIn)
    expect(setSpy).toHaveBeenNthCalledWith(3, "refreshToken", refreshToken)

    setSpy.mockRestore()
  });
});

