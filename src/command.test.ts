import { describe, test, expect } from "vitest";
import { getCommands } from "./command.js";

describe("getCommands", () => {
  test("should return commands", () => {
    const commands = getCommands();
    
    for (const commandName in commands) {
      const command = commands[commandName];
      expect(command.name).toBeTruthy();
      expect(command.description).toBeTruthy();
      expect(typeof command.execute).toBe("function");
    }
  });
});