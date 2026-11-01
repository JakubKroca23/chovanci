/** Party / match-machine error codes shown as Czech copy in multi UI. */
export const MULTI_ERROR_CS: Record<string, string> = {
  JOIN_FIRST: "Nejdřív se musíš připojit k místnosti.",
  ONLY_HOST: "Hru může spustit jen hostitel.",
  NO_LOBBY: "Místnost ještě neexistuje.",
  NO_MATCH: "Zápas ještě neběží.",
  LOBBY_ONLY: "Připojit se jde jen v lobby.",
  DUPLICATE: "Tento hráč už je v místnosti.",
  LOBBY_FULL: "Lobby je plné (max 6 hráčů).",
  ALREADY_STARTED: "Zápas už běží.",
  NEED_PLAYERS: "Ke startu potřebuješ 2–6 hráčů.",
  NOT_PICK: "Teď nejde hrát kartu.",
  UNKNOWN_PLAYER: "Neznámý hráč.",
  ALREADY_PLAYED: "Už jsi v tomto kole zahrál.",
  CARD_NOT_IN_HAND: "Tuhle kartu nemáš v ruce.",
  REBIND_UNKNOWN: "Nepodařilo se znovu připojit — nejsi v této místnosti.",
  BAD_ROOM: "Neplatný kód místnosti.",
};

/** English match-machine throws → stable codes for the client map. */
export const MACHINE_ERROR_TO_CODE: Record<string, string> = {
  "Can only join during lobby": "LOBBY_ONLY",
  "Duplicate player": "DUPLICATE",
  "Lobby full (max 6)": "LOBBY_FULL",
  "Match already started": "ALREADY_STARTED",
  "Need 2–6 players to start": "NEED_PLAYERS",
  "Not in pick phase": "NOT_PICK",
  "Unknown player": "UNKNOWN_PLAYER",
  "Already played this round": "ALREADY_PLAYED",
  "Card not in hand": "CARD_NOT_IN_HAND",
};

export function toMultiErrorCode(message: string): string {
  if (MULTI_ERROR_CS[message]) return message;
  return MACHINE_ERROR_TO_CODE[message] ?? message;
}

export function multiErrorCs(messageOrCode: string): string {
  const code = toMultiErrorCode(messageOrCode);
  return (
    MULTI_ERROR_CS[code] ??
    "Něco se nepovedlo. Zkus to znovu."
  );
}
