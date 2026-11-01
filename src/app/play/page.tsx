"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BoardMinionView } from "@/components/hs/BoardMinion";
import { HeroPlate } from "@/components/hs/HeroPlate";
import { HsCard } from "@/components/hs/HsCard";
import { ManaBar } from "@/components/hs/ManaBar";
import { getCardDef, HEROES } from "@/lib/hs/cards";
import { runBotTurn } from "@/lib/hs/bot";
import { applyAction, createMatch } from "@/lib/hs/engine";
import {
  getActiveDeck,
  loadGeneratedCards,
  loadHero,
  saveHero,
} from "@/lib/hs/storage";
import type { HeroId, HsMatch } from "@/lib/hs/types";
import "./battle.css";

type PendingPlay = { handIndex: number; needs: "enemy_minion" | "friendly_minion" | "any_minion" };

export default function PlayPage() {
  const [heroId, setHeroId] = useState<HeroId>("nevychovanec");
  const [match, setMatch] = useState<HsMatch | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [pendingPlay, setPendingPlay] = useState<PendingPlay | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const extra = useMemo(() => loadGeneratedCards(), [match?.id]);

  useEffect(() => {
    setHeroId(loadHero());
  }, []);

  const start = useCallback(() => {
    const deck = getActiveDeck();
    saveHero(heroId);
    const m = createMatch({
      p0: { id: "human", name: "Ty", heroId, deck: deck.cards },
      p1: {
        id: "bot",
        name: "Bot Chovanec",
        heroId: "prezivanec",
        deck: deck.cards,
      },
      extraCards: loadGeneratedCards(),
    });
    setMatch(m);
    setSelected(null);
    setPendingPlay(null);
    setError(null);
  }, [heroId]);

  function afterHuman(next: HsMatch) {
    setMatch(next);
    setSelected(null);
    setPendingPlay(null);
    if (next.phase !== "ended" && next.active === 1) {
      setBusy(true);
      window.setTimeout(() => {
        setMatch(runBotTurn(next, extra));
        setBusy(false);
      }, 420);
    }
  }

  function doAction(action: Parameters<typeof applyAction>[1]) {
    if (!match || busy || match.phase === "ended") return;
    if (match.active !== 0) return;
    try {
      setError(null);
      afterHuman(applyAction(match, action, extra));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Akce selhala");
    }
  }

  function tryPlayCard(handIndex: number) {
    if (!match || busy) return;
    const def = getCardDef(match.players[0]!.hand[handIndex]!, extra);
    const need = def.effects?.find((e) => e.needsTarget)?.needsTarget;
    if (need === "enemy_minion" || need === "friendly_minion" || need === "any_minion") {
      setPendingPlay({ handIndex, needs: need });
      setSelected(null);
      setError("Vyber cíl na stole.");
      return;
    }
    doAction({ type: "play_card", handIndex });
  }

  const me = match?.players[0];
  const foe = match?.players[1];
  const myTurn = match?.active === 0;

  return (
    <main className="battle">
      <div className="battle__nav">
        <Link className="cs-back" href="/">
          ← Domů
        </Link>
        <span className="battle__brand">ChovanecStone</span>
      </div>

      {!match && (
        <section className="battle__setup">
          <h1>Vstup do arény</h1>
          <p>Vyber hrdinu. Mana 1→10, Coin pro druhého hráče, Rush / Charge / Taunt.</p>
          <div className="battle__heroes">
            {HEROES.map((h) => (
              <button
                key={h.id}
                type="button"
                className={`battle__hero-pick${heroId === h.id ? " battle__hero-pick--on" : ""}`}
                onClick={() => setHeroId(h.id)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={h.art} alt="" />
                <div>
                  <strong>{h.name}</strong>
                  <span>
                    {h.powerText} · {h.powerCost} mana
                  </span>
                </div>
              </button>
            ))}
          </div>
          <button type="button" className="cs-btn cs-btn--primary cs-btn--block" onClick={start}>
            Zahájit zápas
          </button>
        </section>
      )}

      {match && me && foe && (
        <>
          <header className="battle__top">
            <HeroPlate
              name={foe.name}
              heroId={foe.heroId}
              hp={foe.hp}
              armor={foe.armor}
              subtitle={foe.secrets.length ? `Secrets ${foe.secrets.length}` : undefined}
            />
            <div className={`battle__turn${myTurn && !busy ? " battle__turn--active" : ""}`}>
              {match.phase === "ended"
                ? "Konec"
                : busy
                  ? "Bot hraje"
                  : pendingPlay
                    ? "Vyber cíl"
                    : myTurn
                      ? "Tvůj tah"
                      : "Soupeř"}{" "}
              · {match.turn}
            </div>
          </header>

          <div className="battle__board">
            <div className="battle__row battle__row--enemy" aria-label="Soupeřův stůl">
              {foe.board.map((m) => (
                <BoardMinionView
                  key={m.instanceId}
                  minion={m}
                  extra={extra}
                  disabled={busy || !myTurn}
                  onClick={() => {
                    if (pendingPlay && (pendingPlay.needs === "enemy_minion" || pendingPlay.needs === "any_minion")) {
                      doAction({
                        type: "play_card",
                        handIndex: pendingPlay.handIndex,
                        targetInstanceId: m.instanceId,
                      });
                      return;
                    }
                    if (!selected) return;
                    doAction({
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
                disabled={busy || !myTurn || !!pendingPlay}
                onClick={() => {
                  if (!selected) {
                    doAction({ type: "hero_attack", target: "hero" });
                    return;
                  }
                  doAction({
                    type: "attack",
                    attackerInstanceId: selected,
                    target: "hero",
                  });
                }}
              >
                Face · {foe.hp}
              </button>
            </div>

            <div className="battle__row battle__row--mine" aria-label="Tvůj stůl">
              {me.board.map((m) => (
                <BoardMinionView
                  key={m.instanceId}
                  minion={m}
                  extra={extra}
                  selected={selected === m.instanceId}
                  ready={m.canAttack && !m.exhausted}
                  disabled={busy || !myTurn}
                  onClick={() => {
                    if (pendingPlay && (pendingPlay.needs === "friendly_minion" || pendingPlay.needs === "any_minion")) {
                      doAction({
                        type: "play_card",
                        handIndex: pendingPlay.handIndex,
                        targetInstanceId: m.instanceId,
                      });
                      return;
                    }
                    setPendingPlay(null);
                    setSelected((s) => (s === m.instanceId ? null : m.instanceId));
                  }}
                />
              ))}
            </div>
          </div>

          <footer className="battle__bottom">
            <div>
              <HeroPlate
                name={me.name}
                heroId={me.heroId}
                hp={me.hp}
                armor={me.armor}
                subtitle={
                  me.weapon
                    ? `Zbraň ${me.weapon.attack}/${me.weapon.durability}${me.heroAttackedThisTurn ? " (už útočila)" : ""}`
                    : me.secrets.length
                      ? `Secrets ${me.secrets.length}`
                      : undefined
                }
              />
              <div style={{ marginTop: "0.55rem" }}>
                <ManaBar mana={me.mana} maxMana={me.maxMana} />
              </div>
            </div>
            <div className="battle__actions">
              {pendingPlay && (
                <button
                  type="button"
                  className="cs-btn cs-btn--ghost"
                  onClick={() => {
                    setPendingPlay(null);
                    setError(null);
                  }}
                >
                  Zrušit cíl
                </button>
              )}
              <button
                type="button"
                className="cs-btn"
                disabled={busy || me.heroPowerUsed || me.mana < 2 || !myTurn}
                onClick={() => doAction({ type: "hero_power" })}
              >
                Hero power
              </button>
              <button
                type="button"
                className="cs-btn cs-btn--primary"
                disabled={busy || !myTurn}
                onClick={() => doAction({ type: "end_turn" })}
              >
                Konec tahu
              </button>
            </div>
          </footer>

          <div className="battle__hand-wrap">
            <div className="battle__hand" aria-label="Ruka">
              {me.hand.map((cardId, handIndex) => {
                const def = getCardDef(cardId, extra);
                const canPlay = !busy && myTurn && def.cost <= me.mana;
                return (
                  <div key={`${cardId}-${handIndex}`} style={{ ["--i" as string]: handIndex }}>
                    <HsCard
                      def={def}
                      size="sm"
                      showText={false}
                      disabled={!canPlay}
                      selected={pendingPlay?.handIndex === handIndex}
                      onClick={() => tryPlayCard(handIndex)}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {error && <p className="battle__error">{error}</p>}
          {match.phase === "ended" && (
            <div className="battle__banner">
              {match.winner === 0 ? "Vítězství" : "Porážka"}
              <div style={{ marginTop: "0.75rem" }}>
                <button type="button" className="cs-btn cs-btn--primary" onClick={start}>
                  Znovu
                </button>
              </div>
            </div>
          )}
          <div className="battle__log">
            {[...match.log].slice(-10).map((line, i) => (
              <div key={`${i}-${line}`}>{line}</div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
