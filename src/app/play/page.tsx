"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
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

export default function PlayPage() {
  const [heroId, setHeroId] = useState<HeroId>("nevychovanec");
  const [match, setMatch] = useState<HsMatch | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
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
      p0: {
        id: "human",
        name: "Ty",
        heroId,
        deck: deck.cards,
      },
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
    setError(null);
  }, [heroId]);

  function doAction(action: Parameters<typeof applyAction>[1]) {
    if (!match || busy || match.phase === "ended") return;
    if (match.active !== 0) return;
    try {
      setError(null);
      let next = applyAction(match, action, extra);
      setMatch(next);
      setSelected(null);

      if (next.phase !== "ended" && next.active === 1) {
        setBusy(true);
        window.setTimeout(() => {
          next = runBotTurn(next, extra);
          setMatch(next);
          setBusy(false);
        }, 450);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Akce selhala");
    }
  }

  const me = match?.players[0];
  const foe = match?.players[1];

  return (
    <main className="battle">
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <Link href="/">← Domů</Link>
        <span>ChovanecStone</span>
      </div>

      {!match && (
        <section style={{ display: "grid", gap: "1rem", marginTop: "2rem" }}>
          <h1>Hra proti botovi</h1>
          <p>Vyber hrdinu a začni. Deck bereš z aktivního balíčku (nebo starter).</p>
          <div style={{ display: "grid", gap: "0.5rem" }}>
            {HEROES.map((h) => (
              <button
                key={h.id}
                type="button"
                className="battle__btn"
                style={{
                  outline: heroId === h.id ? "2px solid #6bcf7a" : undefined,
                }}
                onClick={() => setHeroId(h.id)}
              >
                <strong>{h.name}</strong> — {h.powerText} (mana {h.powerCost})
              </button>
            ))}
          </div>
          <button type="button" className="battle__btn battle__btn--primary" onClick={start}>
            Start zápasu
          </button>
        </section>
      )}

      {match && me && foe && (
        <>
          <header className="battle__top">
            <div>
              <strong>{foe.name}</strong> · HP {foe.hp}
              {foe.armor ? ` +${foe.armor}` : ""} · Mana {foe.mana}/{foe.maxMana}
              {foe.secrets.length ? ` · Secrets ${foe.secrets.length}` : ""}
            </div>
            <div>Tah {match.turn}</div>
          </header>

          <div className="battle__board">
            <div className="battle__row battle__row--enemy" aria-label="Soupeřův stůl">
              {foe.board.map((m) => {
                const def = getCardDef(m.cardId, extra);
                return (
                  <button
                    key={m.instanceId}
                    type="button"
                    className="battle__minion"
                    onClick={() => {
                      if (!selected) return;
                      doAction({
                        type: "attack",
                        attackerInstanceId: selected,
                        target: m.instanceId,
                      });
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={def.art} alt={def.name} />
                    <div>{def.name}</div>
                    <div className="battle__stats">
                      <span>{m.attack}</span>
                      <span>{m.health}</span>
                    </div>
                  </button>
                );
              })}
              <button
                type="button"
                className="battle__btn battle__btn--danger"
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
                Útok na hrdinu ({foe.hp})
              </button>
            </div>

            <div className="battle__row battle__row--mine" aria-label="Tvůj stůl">
              {me.board.map((m) => {
                const def = getCardDef(m.cardId, extra);
                return (
                  <button
                    key={m.instanceId}
                    type="button"
                    className={`battle__minion${m.canAttack && !m.exhausted ? " battle__minion--ready" : ""}${
                      selected === m.instanceId ? " battle__minion--selected" : ""
                    }`}
                    onClick={() =>
                      setSelected((s) =>
                        s === m.instanceId ? null : m.instanceId,
                      )
                    }
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={def.art} alt={def.name} />
                    <div>{def.name}</div>
                    <div className="battle__stats">
                      <span>{m.attack}</span>
                      <span>{m.health}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <footer className="battle__bottom">
            <div>
              <strong>{me.name}</strong> · HP {me.hp}
              {me.armor ? ` +${me.armor}` : ""} · Mana {me.mana}/{me.maxMana}
              {me.weapon ? ` · Zbraň ${me.weapon.attack}/${me.weapon.durability}` : ""}
            </div>
            <div className="battle__actions">
              <button
                type="button"
                className="battle__btn"
                disabled={busy || me.heroPowerUsed || me.mana < 2}
                onClick={() => doAction({ type: "hero_power" })}
              >
                Hero power
              </button>
              <button
                type="button"
                className="battle__btn battle__btn--primary"
                disabled={busy || match.active !== 0}
                onClick={() => doAction({ type: "end_turn" })}
              >
                Konec tahu
              </button>
            </div>
          </footer>

          <div className="battle__hand" aria-label="Ruka">
            {me.hand.map((cardId, handIndex) => {
              const def = getCardDef(cardId, extra);
              const canPlay = !busy && match.active === 0 && def.cost <= me.mana;
              return (
                <button
                  key={`${cardId}-${handIndex}`}
                  type="button"
                  className="battle__hand-card"
                  disabled={!canPlay}
                  onClick={() => doAction({ type: "play_card", handIndex })}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={def.art} alt={def.name} />
                  <div>
                    ({def.cost}) {def.name}
                  </div>
                  {def.type === "minion" && (
                    <div className="battle__stats">
                      <span>{def.attack}</span>
                      <span>{def.health}</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {error && <p className="battle__error">{error}</p>}
          {match.phase === "ended" && (
            <p className="battle__error">
              {match.winner === 0 ? "Vyhráls!" : "Prohráls."}{" "}
              <button type="button" className="battle__btn" onClick={start}>
                Znovu
              </button>
            </p>
          )}
          {busy && <p className="battle__log">Bot hraje…</p>}
          <div className="battle__log">
            {[...match.log].slice(-8).map((line, i) => (
              <div key={`${i}-${line}`}>{line}</div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
