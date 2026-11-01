"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { CardView } from "@/components/CardView";
import { HandPicker } from "@/components/HandPicker";
import { JoinInvite } from "@/components/JoinInvite";
import { ScoreBoard } from "@/components/ScoreBoard";
import { SituationBanner } from "@/components/SituationBanner";
import { VerdictBanner } from "@/components/VerdictBanner";
import { getSituation } from "@/lib/cards";
import {
  connectToMatch,
  DISCONNECT_CS,
  getOrCreatePlayerId,
  type MatchConnection,
} from "@/lib/multi-client";
import { multiErrorCs } from "@/lib/multi-errors";
import { packLabel, SITUATION_PACKS } from "@/lib/packs";
import { renderShareCardPng, shareOrDownloadPng } from "@/lib/share-card";
import { finaleTitle } from "@/lib/titles";
import type { MatchState, SituationPack } from "@/lib/types";
import "../multi.css";

function MultiRoomInner() {
  const params = useParams<{ code: string }>();
  const searchParams = useSearchParams();

  const code = String(params.code ?? "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 4);
  const name = (searchParams.get("name") ?? "").trim();
  const isHostQuery = searchParams.get("host") === "1";

  const [playerId, setPlayerId] = useState("");
  const [conn, setConn] = useState<MatchConnection | null>(null);
  const [match, setMatch] = useState<MatchState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [shareNote, setShareNote] = useState<string | null>(null);

  const joinUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return `https://chovanec.propoj.app/multi?mode=join&code=${code}`;
    }
    return `${window.location.origin}/multi?mode=join&code=${code}`;
  }, [code]);

  useEffect(() => {
    setPlayerId(getOrCreatePlayerId());
  }, []);

  useEffect(() => {
    if (!code || code.length !== 4 || !name || !playerId) return;

    let alive = true;
    let sawOpen = false;
    let hardCloseTimer: number | undefined;
    const connection = connectToMatch(code);
    setConn(connection);
    setConnected(false);
    setReconnecting(false);
    setBusy(false);

    const clearHardCloseTimer = () => {
      if (hardCloseTimer !== undefined) {
        window.clearTimeout(hardCloseTimer);
        hardCloseTimer = undefined;
      }
    };

    const rebind = () => {
      connection.send({ type: "join", playerId, name });
    };

    const unsub = connection.subscribe((msg) => {
      if (!alive) return;

      if ("type" in msg && msg.type === "connection") {
        if (msg.status === "open") {
          sawOpen = true;
          clearHardCloseTimer();
          setConnected(true);
          setReconnecting(false);
          setError(null);
          // Always rebind on every open (initial connect + PartySocket reconnect).
          rebind();
          return;
        }
        setConnected(false);
        if (msg.status === "error") {
          clearHardCloseTimer();
          setReconnecting(false);
          setError(msg.message);
          return;
        }
        if (msg.status === "closed") {
          // Soft reconnect window — only escalate after ~3s still closed.
          setReconnecting(true);
          clearHardCloseTimer();
          hardCloseTimer = window.setTimeout(() => {
            if (!alive) return;
            setReconnecting(false);
            setError(DISCONNECT_CS);
          }, 3000);
        }
        return;
      }

      if ("type" in msg && msg.type === "error") {
        const codeOrMsg =
          "code" in msg && typeof msg.code === "string" && msg.code
            ? msg.code
            : msg.message;
        setError(multiErrorCs(codeOrMsg));
        setBusy(false);
        return;
      }

      const state = msg as MatchState;
      setMatch(state);
      setError(null);
      setBusy(false);
    });

    // If the socket never opens, surface a Czech error instead of spinning forever.
    const connectWatch = window.setTimeout(() => {
      if (!alive || sawOpen) return;
      setConnected(false);
      setReconnecting(false);
      setError(DISCONNECT_CS);
    }, 8000);

    return () => {
      alive = false;
      window.clearTimeout(connectWatch);
      clearHardCloseTimer();
      unsub();
      connection.close();
      setConn(null);
      setConnected(false);
      setReconnecting(false);
    };
  }, [code, name, playerId]);

  const isHost = match ? match.hostId === playerId : isHostQuery;
  const myHand = match?.hands[playerId] ?? [];
  const alreadyPlayed = Boolean(match?.plays[playerId]);
  const situation = match?.situationId
    ? getSituation(match.situationId)
    : null;

  const winnerCardId = useMemo(() => {
    if (!match?.winnerId) return null;
    return match.plays[match.winnerId] ?? null;
  }, [match]);

  const leader = useMemo(() => {
    if (!match || match.players.length === 0) return null;
    return [...match.players].sort((a, b) => b.score - a.score)[0]!;
  }, [match]);

  const leaderCardId = useMemo(() => {
    if (!match || !leader) return null;
    return match.plays[leader.id] ?? match.hands[leader.id]?.[0] ?? null;
  }, [match, leader]);

  function sendOnce(
    msg: Parameters<NonNullable<typeof conn>["send"]>[0],
  ) {
    if (!conn || busy) return;
    setBusy(true);
    conn.send(msg);
  }

  if (!name) {
    return (
      <main className="multi">
        <Link className="multi__back" href="/multi?mode=join">
          ← Zpět
        </Link>
        <p className="multi__error">Chybí jméno. Vrať se a zadej ho.</p>
      </main>
    );
  }

  if (!code || code.length !== 4) {
    return (
      <main className="multi">
        <Link className="multi__back" href="/">
          ← Domů
        </Link>
        <p className="multi__error">Neplatný kód místnosti.</p>
      </main>
    );
  }

  return (
    <main className="multi">
      <Link className="multi__back" href="/">
        ← Domů
      </Link>

      <header className="multi__header">
        <h1 className="multi__title">Místnost</h1>
        <p className="multi__meta">
          Kód: <span className="multi__code">{code}</span>
          {match ? ` · Kolo ${match.round || "—"}` : null}
        </p>
      </header>

      {error && <p className="multi__error">{error}</p>}

      {reconnecting && !error && (
        <p className="multi__waiting">Znovu připojuji…</p>
      )}

      {!match && !error && !reconnecting && (
        <p className="multi__waiting">
          {connected ? "Připojuji k místnosti…" : "Čekám na spojení…"}
        </p>
      )}

      {match?.phase === "lobby" && (
        <section aria-live="polite">
          <JoinInvite code={code} joinUrl={joinUrl} />
          <p className="multi__hint">
            Hráči {match.players.length} / 6 (start od 2) · Balíček:{" "}
            {packLabel(match.pack ?? "mix")}
          </p>
          {match.players.length === 0 ? (
            <p className="multi__waiting">Zatím nikdo v lobby…</p>
          ) : (
            <ul className="multi__players">
              {match.players.map((player) => (
                <li key={player.id} className="multi__player">
                  <span>
                    {player.name}
                    {player.id === playerId ? " (ty)" : ""}
                  </span>
                  {player.id === match.hostId ? (
                    <span className="multi__player-tag">hostitel</span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          {isHost ? (
            <>
              <p className="multi__hint">Balíček situací</p>
              <div className="pack-picker" role="group" aria-label="Balíček situací">
                {SITUATION_PACKS.map((pack) => (
                  <button
                    key={pack.id}
                    type="button"
                    className={`pack-picker__btn${
                      (match.pack ?? "mix") === pack.id
                        ? " pack-picker__btn--active"
                        : ""
                    }`}
                    disabled={busy}
                    onClick={() =>
                      sendOnce({
                        type: "setPack",
                        pack: pack.id as SituationPack,
                      })
                    }
                  >
                    <strong>{pack.label}</strong>
                    <span>{pack.hint}</span>
                  </button>
                ))}
              </div>
              <div className="multi__actions">
                <button
                  type="button"
                  className="multi__btn multi__btn--green"
                  disabled={
                    busy ||
                    match.players.length < 2 ||
                    match.players.length > 6
                  }
                  onClick={() => sendOnce({ type: "start" })}
                >
                  Spustit hru
                </button>
              </div>
            </>
          ) : (
            <p className="multi__waiting">Čekáme na start od hostitele…</p>
          )}
        </section>
      )}

      {match?.phase === "pick" && situation && (
        <section aria-live="polite">
          <SituationBanner text={situation.text} />
          <ScoreBoard players={match.players} />
          {alreadyPlayed ? (
            <p className="multi__waiting">Čekáme na ostatní…</p>
          ) : (
            <>
              <p className="multi__hint">Vyber kartu z ruky.</p>
              <HandPicker
                cardIds={myHand}
                disabled={alreadyPlayed || busy}
                onPick={(cardId) => sendOnce({ type: "play", cardId })}
              />
            </>
          )}
        </section>
      )}

      {(match?.phase === "reveal" || match?.phase === "verdict") && (
        <section aria-live="polite">
          {situation && <SituationBanner text={situation.text} />}
          {match.verdictText && winnerCardId && (
            <VerdictBanner
              text={match.verdictText}
              winnerCardId={winnerCardId}
            />
          )}
          <div className="multi__plays" aria-label="Zahrané karty">
            {match.players.map((player) => {
              const cardId = match.plays[player.id];
              if (!cardId) return null;
              return (
                <div key={player.id} className="multi__play">
                  <CardView
                    cardId={cardId}
                    compact
                    selected={player.id === match.winnerId}
                  />
                  <p className="multi__play-name">{player.name}</p>
                </div>
              );
            })}
          </div>
          <ScoreBoard players={match.players} />
          {match.phase === "verdict" && (
            <div className="multi__actions">
              <button
                type="button"
                className="multi__btn"
                disabled={busy}
                onClick={() => sendOnce({ type: "next" })}
              >
                Další kolo
              </button>
            </div>
          )}
        </section>
      )}

      {match?.phase === "final" && leader && (
        <section className="multi__finale" aria-live="polite">
          <p className="multi__finale-title">
            {leaderCardId
              ? finaleTitle(leader.name, leaderCardId)
              : `Vítěz: ${leader.name}`}
          </p>
          {match.verdictText && winnerCardId && (
            <VerdictBanner
              text={match.verdictText}
              winnerCardId={winnerCardId}
            />
          )}
          <div className="multi__plays" aria-label="Poslední zahrané karty">
            {match.players.map((player) => {
              const cardId = match.plays[player.id];
              if (!cardId) return null;
              return (
                <div key={player.id} className="multi__play">
                  <CardView
                    cardId={cardId}
                    compact
                    selected={player.id === match.winnerId}
                  />
                  <p className="multi__play-name">{player.name}</p>
                </div>
              );
            })}
          </div>
          <ScoreBoard players={match.players} />
          <div className="multi__actions">
            {leaderCardId && (
              <button
                type="button"
                className="multi__btn multi__btn--green"
                onClick={async () => {
                  try {
                    const title = finaleTitle(leader.name, leaderCardId);
                    const blob = await renderShareCardPng({
                      title,
                      subtitle: `Kód ${code} · ${packLabel(match.pack ?? "mix")}`,
                      cardId: leaderCardId,
                      verdict: match.verdictText ?? undefined,
                      footer: "chovanec.propoj.app",
                    });
                    const result = await shareOrDownloadPng(
                      blob,
                      `chovanci-${code}.png`,
                      title,
                    );
                    setShareNote(
                      result === "shared"
                        ? "Sdíleno."
                        : result === "copied"
                          ? "Obrázek stažen, text ve schránce."
                          : "Obrázek stažen.",
                    );
                  } catch {
                    setShareNote("Sdílení obrázku se nepovedlo.");
                  }
                }}
              >
                Sdílet obrázek
              </button>
            )}
            <Link className="multi__btn multi__btn--secondary" href="/">
              Domů
            </Link>
          </div>
          {shareNote && <p className="multi__hint">{shareNote}</p>}
        </section>
      )}
    </main>
  );
}

export default function MultiRoomPage() {
  return (
    <Suspense
      fallback={
        <main className="multi">
          <p className="multi__waiting">Načítám místnost…</p>
        </main>
      }
    >
      <MultiRoomInner />
    </Suspense>
  );
}
