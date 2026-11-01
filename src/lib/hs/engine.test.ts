import { describe, it, expect } from "vitest";
import { buildStarterDeck } from "./cards";
import { applyAction, createMatch, getLegalActions } from "./engine";

function fresh() {
  return createMatch({
    p0: {
      id: "p0",
      name: "Ty",
      heroId: "nevychovanec",
      deck: buildStarterDeck(),
    },
    p1: {
      id: "p1",
      name: "Bot",
      heroId: "prezivanec",
      deck: buildStarterDeck(),
    },
  });
}

describe("hs engine", () => {
  it("creates match with hands and starts turn 1 mana", () => {
    const m = fresh();
    expect(m.players[0]!.hand.length).toBeGreaterThanOrEqual(3);
    expect(m.players[0]!.mana).toBe(1);
    expect(m.phase).toBe("play");
  });

  it("can end turn and pass active player", () => {
    const m = applyAction(fresh(), { type: "end_turn" });
    expect(m.active).toBe(1);
    expect(m.players[1]!.mana).toBe(1);
  });

  it("lists legal actions including end_turn", () => {
    const actions = getLegalActions(fresh());
    expect(actions.some((a) => a.type === "end_turn")).toBe(true);
  });

  it("hero power nevychovanec damages foe", () => {
    let m = fresh();
    // give mana
    m = structuredClone(m);
    m.players[0]!.mana = 2;
    m = applyAction(m, { type: "hero_power" });
    expect(m.players[1]!.hp).toBe(29);
  });
});
