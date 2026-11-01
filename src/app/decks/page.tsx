"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { HsCard } from "@/components/hs/HsCard";
import { getCoreCards, HEROES } from "@/lib/hs/cards";
import {
  loadDecks,
  loadGeneratedCards,
  loadHero,
  saveDeck,
  saveHero,
  type SavedDeck,
} from "@/lib/hs/storage";
import type { HeroId } from "@/lib/hs/types";

export default function DecksPage() {
  const [heroId, setHeroId] = useState<HeroId>("nevychovanec");
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [name, setName] = useState("Můj deck");
  const [note, setNote] = useState<string | null>(null);

  const pool = useMemo(
    () => [...getCoreCards(), ...loadGeneratedCards()],
    [],
  );

  useEffect(() => {
    setHeroId(loadHero());
    const existing = loadDecks()[0];
    if (existing) {
      setName(existing.name);
      setHeroId(existing.heroId);
      const c: Record<string, number> = {};
      for (const id of existing.cards) c[id] = (c[id] ?? 0) + 1;
      setCounts(c);
    }
  }, []);

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  function add(id: string, rarity: string) {
    const max = rarity === "legendary" ? 1 : 2;
    setCounts((prev) => {
      const n = prev[id] ?? 0;
      if (total >= 30 || n >= max) return prev;
      return { ...prev, [id]: n + 1 };
    });
  }

  function remove(id: string) {
    setCounts((prev) => {
      const n = (prev[id] ?? 0) - 1;
      const next = { ...prev };
      if (n <= 0) delete next[id];
      else next[id] = n;
      return next;
    });
  }

  function save() {
    const cards: string[] = [];
    for (const [id, n] of Object.entries(counts)) {
      for (let i = 0; i < n; i++) cards.push(id);
    }
    if (cards.length !== 30) {
      setNote(`Deck musí mít 30 karet (teď ${cards.length}).`);
      return;
    }
    const deck: SavedDeck = {
      id: "main",
      name,
      heroId,
      cards,
    };
    saveDeck(deck);
    saveHero(heroId);
    setNote("Deck uložen — použije se ve hře vs bot i v 1v1.");
  }

  return (
    <main className="cs-page">
      <Link className="cs-back" href="/">
        ← Domů
      </Link>
      <h1 className="cs-page__title">Decky</h1>
      <p className="cs-page__lead">
        Sestav 30 karet. Teď <strong style={{ color: "var(--cs-brass)" }}>{total}</strong> / 30
      </p>

      <div className="cs-panel" style={{ display: "grid", gap: "0.85rem" }}>
        <label className="cs-field">
          Název
          <input
            className="cs-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {HEROES.map((h) => (
            <button
              key={h.id}
              type="button"
              className={`cs-chip${heroId === h.id ? " cs-chip--on" : ""}`}
              onClick={() => setHeroId(h.id)}
            >
              {h.name}
            </button>
          ))}
        </div>

        <button type="button" className="cs-btn cs-btn--primary" onClick={save}>
          Uložit deck
        </button>
        {note && <p className="cs-note">{note}</p>}
      </div>

      <div className="hs-grid">
        {pool.map((c) => {
          const n = counts[c.id] ?? 0;
          return (
            <div key={c.id} style={{ display: "grid", gap: "0.45rem", justifyItems: "center" }}>
              <HsCard
                def={c}
                as="div"
                size="sm"
                showText={false}
                selected={n > 0}
              />
              <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
                <button type="button" className="cs-btn cs-btn--ghost" style={{ minHeight: 40, padding: "0.35rem 0.75rem" }} onClick={() => remove(c.id)}>
                  −
                </button>
                <strong style={{ fontFamily: "var(--font-display)", minWidth: "1.5rem", textAlign: "center" }}>
                  {n}
                </strong>
                <button type="button" className="cs-btn cs-btn--ghost" style={{ minHeight: 40, padding: "0.35rem 0.75rem" }} onClick={() => add(c.id, c.rarity)}>
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
