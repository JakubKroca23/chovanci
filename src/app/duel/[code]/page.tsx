"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { BoardMinionView } from "@/components/hs/BoardMinion";
import { HeroPlate } from "@/components/hs/HeroPlate";
import { HsCard } from "@/components/hs/HsCard";
import { ManaBar } from "@/components/hs/ManaBar";
import { getCardDef } from "@/lib/hs/cards";
import { connectHsMatch } from "@/lib/hs/multi-client";
import { getActiveDeck, loadHero } from "@/lib/hs/storage";
import type { HsMatch } from "@/lib/hs/types";
import "../../play/battle.css";

type PendingPlay = {
  handIndex: number;
  needs: "enemy_minion" | "friendly_minion" | "any_minion";
};

function DuelInner() {
  const params = useParams<{ code: string }>();
  const search = useSearchParams();
  const code = String(params.code ?? "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 4);
  const name = (search.get("name") ?? "Hráč").trim() || "Hráč";

  const [match, setMatch] = useState<HsMatch | null>(null);
  const [you, setYou] = useState<0 | 1>(0);
  const [status, setStatus] = useState("Připojuji…");
  const [selected, setSelected] = useState<string | null>(null);
  const [pendingPlay, setPendingPlay] = useState<PendingPlay | null>(null);
  const [send, setSend] = useState<((msg: unknown) => void) | null>(null);

  useEffect(() => {
    if (code.length !== 4) return;
    const conn = connectHsMatch(code);
    setSend(() => conn.send);
    const deck = getActiveDeck();
    const unsub = conn.subscribe((msg) => {
      if (msg.type === "connection" && msg.status === "open") {
        conn.send({
          type: "join",
          playerId: conn.playerId,
          name,
          heroId: loadHero(),
          deck: deck.cards,
        });
        setStatus("Lobby — čekám na soupeře…");
      }
      if (msg.type === "lobby") setStatus(msg.message);
      if (msg.type === "state") {
        setMatch(msg.match);
        setYou(msg.you);
        setStatus(msg.match.phase === "ended" ? "Konec" : "Zápas");
        setPendingPlay(null);
        setSelected(null);
      }
      if (msg.type === "error") setStatus(msg.message);
    });
    return () => {
      unsub();
      conn.close();
    };
  }, [code, name]);

  const me = match?.players[you];
  const foe = match?.players[you === 0 ? 1 : 0];
  const myTurn = match?.active === you;

  function act(action: object) {
    send?.({ type: "action", action });
    setSelected(null);
    setPendingPlay(null);
  }

  function tryPlay(handIndex: number) {
    if (!me) return;
    const def = getCardDef(me.hand[handIndex]!);
    const need = def.effects?.find((e) => e.needsTarget)?.needsTarget;
    if (need === "enemy_minion" || need === "friendly_minion" || need === "any_minion") {
      setPendingPlay({ handIndex, needs: need });
      setStatus("Vyber cíl");
      return;
    }
    act({ type: "play_card", handIndex });
  }

  return (
    <main className="battle">
      <div className="battle__nav">
        <Link className="cs-back" href="/">
          ← Domů
        </Link>
        <span className="battle__brand">Duel · {code}</span>
      </div>

      {!match && (
        <section className="battle__setup">
          <h1>Čekárna</h1>
          <p className="battle__lobby-code">{code}</p>
          <p>{status}</p>
          <p>Sdílej kód. Až budou dva, zápas naskočí.</p>
        </section>
      )}

      {match && me && foe && (
        <>
          <header className="battle__top">
            <HeroPlate name={foe.name} heroId={foe.heroId} hp={foe.hp} armor={foe.armor} />
            <div className={`battle__turn${myTurn ? " battle__turn--active" : ""}`}>
              {pendingPlay ? "Vyber cíl" : myTurn ? "Tvůj tah" : "Soupeřův tah"} · {match.turn}
            </div>
          </header>

          <div className="battle__board">
            <div className="battle__row battle__row--enemy">
              {foe.board.map((m) => (
                <BoardMinionView
                  key={m.instanceId}
                  minion={m}
                  disabled={!myTurn}
                  onClick={() => {
                    if (pendingPlay && (pendingPlay.needs === "enemy_minion" || pendingPlay.needs === "any_minion")) {
                      act({
                        type: "play_card",
                        handIndex: pendingPlay.handIndex,
                        targetInstanceId: m.instanceId,
                      });
                      return;
                    }
                    if (!selected) return;
                    act({
                      type: "attack",
                      attackerInstanceId: selected,
                      target: m.instanceId,
                    });
                  }}
                />
              ))}
              <button
                type="button"
                className="battle__face"
                disabled={!myTurn || !!pendingPlay}
                onClick={() =>
                  selected
                    ? act({
                        type: "attack",
                        attackerInstanceId: selected,
                        target: "hero",
                      })
                    : act({ type: "hero_attack", target: "hero" })
                }
              >
                Face · {foe.hp}
              </button>
            </div>
            <div className="battle__row battle__row--mine">
              {me.board.map((m) => (
                <BoardMinionView
                  key={m.instanceId}
                  minion={m}
                  selected={selected === m.instanceId}
                  ready={m.canAttack && !m.exhausted}
                  disabled={!myTurn}
                  onClick={() => {
                    if (pendingPlay && (pendingPlay.needs === "friendly_minion" || pendingPlay.needs === "any_minion")) {
                      act({
                        type: "play_card",
                        handIndex: pendingPlay.handIndex,
                        targetInstanceId: m.instanceId,
                      });
                      return;
                    }
                    setSelected(m.instanceId);
                  }}
                />
              ))}
            </div>
          </div>

          <footer className="battle__bottom">
            <div>
              <HeroPlate name={me.name} heroId={me.heroId} hp={me.hp} armor={me.armor} />
              <div style={{ marginTop: "0.55rem" }}>
                <ManaBar mana={me.mana} maxMana={me.maxMana} />
              </div>
            </div>
            <div className="battle__actions">
              <button
                type="button"
                className="cs-btn"
                disabled={!myTurn || me.heroPowerUsed || me.mana < 2}
                onClick={() => act({ type: "hero_power" })}
              >
                Hero power
              </button>
              <button
                type="button"
                className="cs-btn cs-btn--primary"
                disabled={!myTurn}
                onClick={() => act({ type: "end_turn" })}
              >
                Konec tahu
              </button>
            </div>
          </footer>

          <div className="battle__hand-wrap">
            <div className="battle__hand">
              {me.hand.map((id, handIndex) => {
                const def = getCardDef(id);
                return (
                  <HsCard
                    key={`${id}-${handIndex}`}
                    def={def}
                    size="sm"
                    showText={false}
                    disabled={!myTurn || def.cost > me.mana}
                    selected={pendingPlay?.handIndex === handIndex}
                    onClick={() => tryPlay(handIndex)}
                  />
                );
              })}
            </div>
          </div>

          {match.phase === "ended" && (
            <div className="battle__banner">
              {match.winner === you ? "Vítězství" : "Porážka"}
            </div>
          )}
        </>
      )}
    </main>
  );
}

export default function DuelPage() {
  return (
    <Suspense
      fallback={
        <main className="battle">
          <p className="battle__log">Načítám duel…</p>
        </main>
      }
    >
      <DuelInner />
    </Suspense>
  );
}
