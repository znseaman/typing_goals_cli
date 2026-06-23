import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { commandClear } from "./clear.js";
import { State } from "../state.test.js";

describe("commandClear", () => {
  let cursorToSpy: ReturnType<typeof vi.spyOn>;
  let clearScreenDownSpy: ReturnType<typeof vi.spyOn>;
  let state: Record<string, any>;

  beforeEach(() => {
    state = new State()
    cursorToSpy = vi.spyOn(state.readlineModule, "cursorTo").mockImplementation(() => true);
    clearScreenDownSpy = vi.spyOn(state.readlineModule, "clearScreenDown").mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should call readline methods", async () => {
    // @ts-ignore
    await commandClear(state);

    // 3. Assert the calls
    expect(cursorToSpy).toHaveBeenCalledWith(process.stdout, 0, 0);
    expect(clearScreenDownSpy).toHaveBeenCalledWith(process.stdout);
  });
});
