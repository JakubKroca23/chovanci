"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { getCardDef } from "@/lib/hs/cards";
import { connectHsMatch } from "@/lib/hs/multi-client";
import { getActiveDeck, loadHero } from "@/lib/hs/storage";
import type { HsMatch } from "@/lib/hs/types";
import "../../play/battle.css";

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
        setStatus("V lobby — čekám na 2. hráče…");
      }
      if (msg.type === "lobby") setStatus(msg.message);
      if (msg.type === "state") {
        setMatch(msg.match);
        setYou(msg.you);
        setStatus(msg.match.phase === "ended" ? "Konec" : "Zápas");
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
  }

  return (
    <main className="battle">
      <Link href="/">← Domů</Link>
      <p>
        Duel {code} · {status}
      </p>
      {!match && <p className="battle__log">Sdílej kód kamarádovi. Až budou 2, zápas naskočí.</p>}
      {match && me && foe && (
        <>
          <header className="battle__top">
            <span>
              {foe.name} HP {foe.hp}
            </span>
            <span>{myTurn ? "Tvůj tah" : "Soupeřův tah"}</span>
          </header>
          <div className="battle__row battle__row--enemy">
            {foe.board.map((m) => (
              <button
                key={m.instanceId}
                type="button"
                className="battle__minion"
                disabled={!myTurn || !selected}
                onClick={() =>
                  act({
                    type: "attack",
                    attackerInstanceId: selected,
                    target: m.instanceId,
                  })
                }
              >
                {getCardDef(m.cardId).name} {m.attack}/{m.health}
              </button>
            ))}
            <button
              type="button"
              className="battle__btn battle__btn--danger"
              disabled={!myTurn}
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
              Face ({foe.hp})
            </button>
          </div>
          <div className="battle__row battle__row--mine">
            {me.board.map((m) => (
              <button
                key={m.instanceId}
                type="button"
                className={`battle__minion${selected === m.instanceId ? " battle__minion--selected" : ""}`}
                disabled={!myTurn}
                onClick={() => setSelected(m.instanceId)}
              >
                {getCardDef(m.cardId).name} {m.attack}/{m.health}
              </button>
            ))}
          </div>
          <footer className="battle__bottom">
            <span>
              {me.name} HP {me.hp} · Mana {me.mana}/{me.maxMana}
            </span>
            <button
              type="button"
              className="battle__btn battle__btn--primary"
              disabled={!myTurn}
              onClick={() => act({ type: "end_turn" })}
            >
              Konec tahu
            </button>
            <button
              type="button"
              className="battle__btn"
              disabled={!myTurn || me.heroPowerUsed || me.mana < 2}
              onClick={() => act({ type: "hero_power" })}
            >
              Hero power
            </button>
          </footer>
          <div className="battle__hand">
            {me.hand.map((id, handIndex) => {
              const def = getCardDef(id);
              return (
                <button
                  key={`${id}-${handIndex}`}
                  type="button"
                  className="battle__hand-card"
                  disabled={!myTurn || def.cost > me.mana}
                  onClick={() => act({ type: "play_card", handIndex })}
                >
                  ({def.cost}) {def.name}
                </button>
              );
            })}
          </div>
        </>
      )}
    </main>
  );
}

export default function DuelPage() {
  return (
    <Suspense fallback={<main className="battle">Načítám…</main>}>
      <DuelInner />
    </Suspense>
  );
}
