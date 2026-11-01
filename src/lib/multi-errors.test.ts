import { describe, it, expect } from "vitest";
import {
  multiErrorCs,
  toMultiErrorCode,
} from "./multi-errors";

describe("multi-errors", () => {
  it("maps party codes to Czech", () => {
    expect(multiErrorCs("JOIN_FIRST")).toMatch(/připoj/i);
    expect(multiErrorCs("ONLY_HOST")).toMatch(/hostitel/i);
    expect(multiErrorCs("JOIN_FIRST")).not.toMatch(/Join first/i);
    expect(multiErrorCs("ONLY_HOST")).not.toMatch(/Only host/i);
  });

  it("maps English machine throws via codes", () => {
    expect(toMultiErrorCode("Can only join during lobby")).toBe("LOBBY_ONLY");
    expect(multiErrorCs("Duplicate player")).toMatch(/už je/i);
    expect(multiErrorCs("Unknown player")).toMatch(/Neznámý/i);
  });

  it("falls back for unknown messages", () => {
    expect(multiErrorCs("Totally unknown boom")).toMatch(/nepovedlo/i);
  });
});
