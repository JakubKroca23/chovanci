import { getCardDef } from "./cards";
import { applyAction, getLegalActions } from "./engine";
import type { HsAction, HsCardDef, HsMatch } from "./types";

function scoreAction(match: HsMatch, action: HsAction, extra: HsCardDef[]): number {
  const me = match.players[match.active]!;
  const foe = match.players[match.active === 0 ? 1 : 0]!;

  switch (action.type) {
    case "play_card": {
      const id = me.hand[action.handIndex];
      if (!id) return 0;
      const def = getCardDef(id, extra);
      let score = 12 + def.cost * 3;
      if (def.type === "minion") score += (def.attack ?? 0) + (def.health ?? 0);
      if (def.type === "spell") score += 8;
      if (def.type === "secret") score += 6;
      if (def.type === "weapon") score += 10;
      if (def.id === "the_coin" && me.mana === 0) score += 20;
      if (action.targetInstanceId) {
        const t = foe.board.find((m) => m.instanceId === action.targetInstanceId);
        if (t && t.health <= 3) score += 10;
      }
      return score;
    }
    case "attack": {
      if (action.target === "hero") {
        return foe.hp <= me.board.find((m) => m.instanceId === action.attackerInstanceId)?.attack!
          ? 100
          : 22 + (foe.hp < 12 ? 12 : 0);
      }
      const attacker = me.board.find((m) => m.instanceId === action.attackerInstanceId);
      const target = foe.board.find((m) => m.instanceId === action.target);
      if (!attacker || !target) return 5;
      let score = 18;
      if (target.health <= attacker.attack) score += 14;
      if (attacker.health <= target.attack) score -= 6;
      if (target.keywords.includes("taunt")) score += 8;
      return score;
    }
    case "hero_attack":
      return action.target === "hero" ? 16 : 15;
    case "hero_power":
      return me.mana >= 2 ? 7 : 0;
    case "end_turn":
      return me.mana === 0 ? 1 : -5;
    default:
      return 1;
  }
}

export function chooseBotAction(
  match: HsMatch,
  extra: HsCardDef[] = [],
): HsAction {
  const actions = getLegalActions(match, extra);
  if (actions.length === 0) return { type: "end_turn" };
  const ranked = [...actions].sort(
    (a, b) => scoreAction(match, b, extra) - scoreAction(match, a, extra),
  );
  return ranked[0]!;
}

export function runBotTurn(
  match: HsMatch,
  extra: HsCardDef[] = [],
  maxSteps = 40,
): HsMatch {
  let state = match;
  for (let i = 0; i < maxSteps; i++) {
    if (state.phase === "ended") return state;
    const action = chooseBotAction(state, extra);
    state = applyAction(state, action, extra);
    if (action.type === "end_turn") return state;
  }
  return applyAction(state, { type: "end_turn" }, extra);
}
