"use client";

import Link from "next/link";
import { useState } from "react";
import { saveGeneratedCard } from "@/lib/hs/storage";
import type { HsCardDef } from "@/lib/hs/types";

export default function GeneratorPage() {
  const [prompt, setPrompt] = useState("");
  const [card, setCard] = useState<HsCardDef | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function generate() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/generate-card", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = (await res.json()) as {
        card?: HsCardDef;
        message?: string;
        error?: string;
      };
      if (!res.ok || !data.card) {
        setMessage(data.error ?? "Generování selhalo.");
        return;
      }
      setCard(data.card);
      setMessage(data.message ?? null);
    } catch {
      setMessage("Síťová chyba.");
    } finally {
      setBusy(false);
    }
  }

  function approve() {
    if (!card) return;
    saveGeneratedCard(card);
    setMessage(`Schváleno: ${card.name} je ve sbírce / deck builderu.`);
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <Link href="/">← Domů</Link>
      <h1 className="mt-4 text-3xl font-bold">Generátor karet</h1>
      <p className="opacity-80">
        Napiš nápad → AI navrhne kartu → schválíš do sbírky.
      </p>

      <textarea
        className="mt-4 min-h-28 w-full rounded-xl border p-3"
        placeholder="např. chovanec co vaří kafe a má Taunt"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />
      <button
        type="button"
        className="mt-3 w-full rounded-full bg-[#2f6b4f] py-3 font-semibold text-white disabled:opacity-50"
        disabled={busy || prompt.trim().length < 3}
        onClick={generate}
      >
        {busy ? "Generuju…" : "Navrhnout kartu"}
      </button>

      {message && <p className="mt-3 text-sm opacity-80">{message}</p>}

      {card && (
        <article className="mt-6 overflow-hidden rounded-2xl border border-black/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={card.art} alt={card.name} className="h-56 w-full object-cover" />
          <div className="space-y-2 p-4">
            <h2 className="text-xl font-bold">
              ({card.cost}) {card.name}
            </h2>
            <p className="text-sm opacity-70">
              {card.type}
              {card.attack != null ? ` · ${card.attack}/${card.health}` : ""} ·{" "}
              {card.rarity}
            </p>
            <p>{card.text}</p>
            {card.keywords?.length ? (
              <p className="text-xs uppercase tracking-wide opacity-60">
                {card.keywords.join(" · ")}
              </p>
            ) : null}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                className="flex-1 rounded-full bg-[#2f6b4f] py-2 font-semibold text-white"
                onClick={approve}
              >
                Schválit
              </button>
              <button
                type="button"
                className="flex-1 rounded-full border py-2"
                onClick={() => setCard(null)}
              >
                Zahodit
              </button>
            </div>
          </div>
        </article>
      )}
    </main>
  );
}
