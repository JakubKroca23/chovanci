import { describe, it, expect } from "vitest";
import type { CardTag } from "./types";

describe("types", () => {
  it("allows known tags", () => {
    const tag: CardTag = "chaos";
    expect(tag).toBe("chaos");
  });
});
