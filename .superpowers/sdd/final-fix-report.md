# Final whole-branch review — follow-up

Branch: `feature/chovanci-mvp`  
Date: 2026-11-01

## Review verdict addressed

Parent review: **Request changes** (multiplayer reconnect identity gap).

## Fixes landed

### Critical — multiplayer rebind after reconnect/refresh
- Client (`src/app/multi/[code]/page.tsx`): on every PartySocket `open`, send `join` with the same `playerId` + `name` (no skip-after-first-success).
- `connectToMatch` replays `open` to late subscribers so rebind is not missed.
- Party (`party/match.ts`): if `playerId` already in `MatchState.players`, call `rebindPlayer` and bind `connection.state.playerId` (works mid-match); new players still only via `joinLobby` in lobby.
- Match machine: `rebindPlayer(state, playerId)` validates known id, throws `Unknown player` otherwise.
- Test: mid-pick rebind success + unknown id throw.

### Important — Czech errors in multi UI
- `src/lib/multi-errors.ts`: error codes → Czech map; English machine throws mapped to codes.
- Party sends `{ type: "error", code, message: code }`; multi page displays `multiErrorCs(...)`.
- Users no longer see raw `"Join first"` / `"Only host can start"`.

### Important — used situations across match
- `MatchState.usedSituationIds` added; `createLobby` init `[]`; `startMatch` seeds with first situation; `advanceAfterVerdict` excludes all used this match and appends the new id.
- Tests assert growing unique list across 5 rounds.

### Important — README hand sizes
- Documented scaled hands: 2–4→4, 5→3, 6→2 near multiplayer section.

### Nice — solo share verdict
- Solo share text now includes `outcome.verdictText` when present.

## Verification

```text
npx vitest run
Test Files  8 passed (8)
Tests       27 passed (27)
```

## Remaining known debt (unchanged)
- Task1 tautology smoke
- Hands broadcast to all clients (UI hides own-hand intent)
- Live browser acceptance Partial
- Workplace EN loanwords in content
- Finale title card heuristic / dead `reveal` UI branch (accepted)

## Assessment after fixes

Reconnect binding + Czech errors + situation anti-repeat are addressed; MVP happy path and reconnect mid-pick are covered by unit tests. Ready for re-review / merge judgment.
