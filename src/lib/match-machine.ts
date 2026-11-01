import {
  dealHands,
  playCard,
  drawCard,
  pickSituationId,
  handSizeFor,
} from "./deck";
import { judgeRound } from "./judge";
import { getSituation } from "./cards";
import type { MatchState } from "./types";

export function createLobby(
  code: string,
  hostId: string,
  hostName: string,
): MatchState {
  return {
    code,
    hostId,
    players: [{ id: hostId, name: hostName, score: 0 }],
    round: 0,
    phase: "lobby",
    situationId: null,
    usedSituationIds: [],
    plays: {},
    winnerId: null,
    verdictText: null,
    hands: {},
    deck: [],
    discard: [],
  };
}

export function joinLobby(
  state: MatchState,
  playerId: string,
  name: string,
): MatchState {
  if (state.phase !== "lobby") {
    throw new Error("Can only join during lobby");
  }
  if (state.players.some((p) => p.id === playerId)) {
    throw new Error("Duplicate player");
  }
  if (state.players.length >= 6) {
    throw new Error("Lobby full (max 6)");
  }
  return {
    ...state,
    players: [...state.players, { id: playerId, name, score: 0 }],
  };
}

/** Validate that playerId is already in the match (reconnect / refresh). */
export function rebindPlayer(state: MatchState, playerId: string): MatchState {
  if (!state.players.some((p) => p.id === playerId)) {
    throw new Error("Unknown player");
  }
  return state;
}

export function startMatch(state: MatchState, seed: string): MatchState {
  if (state.phase !== "lobby") {
    throw new Error("Match already started");
  }
  const n = state.players.length;
  if (n < 2 || n > 6) {
    throw new Error("Need 2–6 players to start");
  }
  const playerIds = state.players.map((p) => p.id);
  const { hands, deck } = dealHands(playerIds, seed);
  const situationId = pickSituationId(seed, []);
  return {
    ...state,
    round: 1,
    phase: "pick",
    situationId,
    usedSituationIds: [situationId],
    plays: {},
    winnerId: null,
    verdictText: null,
    hands,
    deck,
    discard: [],
  };
}

export function submitPlay(
  state: MatchState,
  playerId: string,
  cardId: string,
): MatchState {
  if (state.phase !== "pick") {
    throw new Error("Not in pick phase");
  }
  if (!state.players.some((p) => p.id === playerId)) {
    throw new Error("Unknown player");
  }
  if (state.plays[playerId]) {
    throw new Error("Already played this round");
  }
  const hand = state.hands[playerId] ?? [];
  if (!hand.includes(cardId)) {
    throw new Error("Card not in hand");
  }

  const nextHands = {
    ...state.hands,
    [playerId]: playCard(hand, cardId),
  };
  const plays = { ...state.plays, [playerId]: cardId };
  let next: MatchState = { ...state, hands: nextHands, plays };

  if (Object.keys(plays).length < state.players.length) {
    return next;
  }

  // All played → reveal then auto verdict (or final on round 5)
  next = { ...next, phase: "reveal" };

  const situation = getSituation(state.situationId!);
  const seed = `${state.code}:${state.round}`;
  const cardIds = state.players.map((p) => plays[p.id]);
  const { winnerCardId, verdictText } = judgeRound(cardIds, situation, seed);
  const winnerId =
    state.players.find((p) => plays[p.id] === winnerCardId)?.id ?? null;

  const players = state.players.map((p) =>
    p.id === winnerId ? { ...p, score: p.score + 1 } : p,
  );

  const phase = state.round >= 5 ? "final" : "verdict";
  return {
    ...next,
    phase,
    players,
    winnerId,
    verdictText,
  };
}

export function advanceAfterVerdict(
  state: MatchState,
  seed: string,
): MatchState {
  if (state.phase === "final") {
    return state;
  }
  if (state.phase !== "verdict") {
    return state;
  }

  // Played cards → discard; refill hands to scaled hand size
  const targetHandSize = handSizeFor(state.players.length);
  let discard = [
    ...state.discard,
    ...Object.values(state.plays),
  ];
  let deck = [...state.deck];
  const hands: Record<string, string[]> = { ...state.hands };

  for (const player of state.players) {
    let hand = hands[player.id] ?? [];
    while (hand.length < targetHandSize) {
      const drawn = drawCard(hand, deck, discard);
      hand = drawn.hand;
      deck = drawn.deck;
      discard = drawn.discard;
      if (
        hand.length < targetHandSize &&
        deck.length === 0 &&
        discard.length === 0
      ) {
        break;
      }
    }
    hands[player.id] = hand;
  }

  const nextRound = state.round + 1;
  const used = [...state.usedSituationIds];
  const situationId = pickSituationId(seed, used);

  return {
    ...state,
    round: nextRound,
    phase: "pick",
    situationId,
    usedSituationIds: [...used, situationId],
    plays: {},
    winnerId: null,
    verdictText: null,
    hands,
    deck,
    discard,
  };
}
