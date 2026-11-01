import { applyAction, getLegalActions } from "./engine";
import type { HsAction, HsCardDef, HsMatch } from "./types";

function scoreAction(match: HsMatch, action: HsAction): number {
  const me = match.players[match.active]!;
  const foe = match.players[match.active === 0 ? 1 : 0]!;
  switch (action.type) {
    case "play_card": {
      // Prefer spending mana
      return 10 + (me.hand[action.handIndex] ? 5 : 0);
    }
    case "attack": {
      if (action.target === "hero") return 20 + (foe.hp < 10 ? 15 : 0);
      return 18;
    }
    case "hero_attack":
      return action.target === "hero" ? 16 : 14;
    case "hero_power":
      return 8;
    case "end_turn":
      return 0;
    default:
      return 1;
  }
}

/** Pick a reasonable action for the active player. */
export function chooseBotAction(
  match: HsMatch,
  extra: HsCardDef[] = [],
): HsAction {
  const actions = getLegalActions(match, extra);
  if (actions.length === 0) return { type: "end_turn" };

  // Spend mana / attack before ending
  const ranked = [...actions].sort(
    (a, b) => scoreAction(match, b) - scoreAction(match, a),
  );
  return ranked[0]!;
}

/** Run bot until it ends turn or match ends (max steps guard). */
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
