import { describe, test, vi, expect } from "vitest";
import { promptDbURL } from "./index.js"
import { read } from "read"
import { config } from "../config.js";
import { logger } from "../ui/logger.js";

// globally mock the "read" module
vi.mock("read", async (importOriginal) => {
  const actual = await importOriginal<typeof import("read")>()
  return {
    ...actual,
    read: vi.fn(), 
  }
})

describe("DB Index", () => {
  test("promptDbURL success", async () => {
    const configGet = vi.spyOn(config, "get").mockImplementation(() => {})
    const configSet = vi.spyOn(config, "set").mockImplementation(() => {})
    const successSpy = vi.spyOn(logger, "success").mockImplementation(() => {})
    vi.mocked(read).mockResolvedValue("postgres//url")

    // @ts-ignore
    const expected = await promptDbURL(config);

    expect(configGet).toHaveBeenNthCalledWith(1, "dbURL")

    expect(configSet).toHaveBeenNthCalledWith(1, "dbURL", "postgres//url")
    expect(successSpy).toHaveBeenNthCalledWith(1, "Successfully set the database url!")

    expect(expected).toBe("postgres//url");
    
    configGet.mockRestore();
    configSet.mockRestore();
    successSpy.mockRestore();
  });

  test("promptDbURL failure", async () => {
    const configGet = vi.spyOn(config, "get").mockImplementation(() => {})
    const configSet = vi.spyOn(config, "set").mockImplementation(() => {})
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {})
    vi.mocked(read).mockRejectedValue(new Error("Failed to read from input"))

    // @ts-ignore
    const expected = await promptDbURL(config);

    expect(configGet).toHaveBeenNthCalledWith(1, "dbURL")

    expect(errorSpy).toHaveBeenNthCalledWith(1, `An error occurred: Failed to read from input. Please try again.`);

    expect(expected).toBe("");
    
    configGet.mockRestore();
    configSet.mockRestore();
    errorSpy.mockRestore();
  });
});