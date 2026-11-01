import { describe, it, expect } from "vitest";
import { buildStarterDeck, getCardDef } from "./cards";
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
  it("creates match with HS opening hands and coin for P2", () => {
    const m = fresh();
    expect(m.players[0]!.hand.length).toBe(4); // 3 + draw on turn start
    expect(m.players[0]!.mana).toBe(1);
    expect(m.players[1]!.hand.includes("the_coin")).toBe(true);
    expect(m.phase).toBe("play");
  });

  it("can end turn and pass active player with 1 mana", () => {
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
    m = structuredClone(m);
    m.players[0]!.mana = 2;
    m = applyAction(m, { type: "hero_power" });
    expect(m.players[1]!.hp).toBe(29);
  });

  it("coin grants temporary mana", () => {
    let m = applyAction(fresh(), { type: "end_turn" });
    const coinIdx = m.players[1]!.hand.indexOf("the_coin");
    expect(coinIdx).toBeGreaterThanOrEqual(0);
    m = applyAction(m, { type: "play_card", handIndex: coinIdx });
    expect(m.players[1]!.mana).toBe(2);
  });

  it("weapon can only attack once per turn", () => {
    let m = fresh();
    m = structuredClone(m);
    m.players[0]!.mana = 10;
    m.players[0]!.weapon = { cardId: "weapon_pasilka", attack: 3, durability: 2 };
    m = applyAction(m, { type: "hero_attack", target: "hero" });
    expect(m.players[1]!.hp).toBe(27);
    expect(() => applyAction(m, { type: "hero_attack", target: "hero" })).toThrow();
  });

  it("rush cannot go face while slept", () => {
    let m = fresh();
    m = structuredClone(m);
    m.players[0]!.mana = 10;
    const def = getCardDef("nadchovanec");
    m.players[0]!.hand.push(def.id);
    const idx = m.players[0]!.hand.length - 1;
    m = applyAction(m, { type: "play_card", handIndex: idx });
    const minion = m.players[0]!.board[0]!;
    expect(minion.rush).toBe(true);
    const face = getLegalActions(m).find(
      (a) =>
        a.type === "attack" &&
        a.attackerInstanceId === minion.instanceId &&
        a.target === "hero",
    );
    expect(face).toBeUndefined();
  });
});
