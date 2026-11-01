import { describe, it, expect } from "vitest";
import { finaleTitle } from "./titles";
import { getCard } from "./cards";

describe("titles", () => {
  it("formats finale title with card name and winner", () => {
    const card = getCard("chovanec");
    expect(finaleTitle("Ada", "chovanec")).toBe(
      `Největší ${card.name} večera: Ada`,
    );
  });
});
