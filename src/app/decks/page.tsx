"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
    setNote("Deck uložen — použije se ve hře vs bot.");
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/">← Domů</Link>
      <h1 className="mt-4 text-3xl font-bold">Decky</h1>
      <p className="opacity-70">Sestav 30 karet. {total} / 30</p>

      <label className="mt-4 block">
        Název
        <input
          className="mt-1 w-full rounded-lg border px-3 py-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>

      <div className="mt-3 flex flex-wrap gap-2">
        {HEROES.map((h) => (
          <button
            key={h.id}
            type="button"
            className="rounded-full border px-3 py-2 text-sm"
            style={{ outline: heroId === h.id ? "2px solid #2f6b4f" : undefined }}
            onClick={() => setHeroId(h.id)}
          >
            {h.name}
          </button>
        ))}
      </div>

      <button
        type="button"
        className="mt-4 rounded-full bg-[#2f6b4f] px-4 py-2 font-semibold text-white"
        onClick={save}
      >
        Uložit deck
      </button>
      {note && <p className="mt-2 text-sm opacity-80">{note}</p>}

      <div className="mt-6 grid gap-2">
        {pool.map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between gap-2 rounded-lg border border-black/10 p-2"
          >
            <div className="min-w-0">
              <div className="truncate font-semibold">
                ({c.cost}) {c.name}{" "}
                <span className="text-xs opacity-60">{c.type}</span>
              </div>
              <div className="text-xs opacity-70">{c.text}</div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" className="px-2" onClick={() => remove(c.id)}>
                −
              </button>
              <span className="w-4 text-center">{counts[c.id] ?? 0}</span>
              <button
                type="button"
                className="px-2"
                onClick={() => add(c.id, c.rarity)}
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
