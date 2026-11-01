"use client";

import Link from "next/link";
import { useState } from "react";
import { HsCard } from "@/components/hs/HsCard";
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
    setMessage(`Schváleno: ${card.name} je ve sbírce a deck builderu.`);
  }

  return (
    <main className="cs-page" style={{ maxWidth: "32rem" }}>
      <Link className="cs-back" href="/">
        ← Domů
      </Link>
      <h1 className="cs-page__title">Generátor</h1>
      <p className="cs-page__lead">
        Napiš nápad → AI navrhne kartu → schválíš do sbírky.
      </p>

      <div className="cs-panel">
        <label className="cs-field">
          Nápad
          <textarea
            placeholder="např. chovanec co vaří kafe a má Taunt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </label>
        <button
          type="button"
          className="cs-btn cs-btn--primary cs-btn--block"
          style={{ marginTop: "0.85rem" }}
          disabled={busy || prompt.trim().length < 3}
          onClick={generate}
        >
          {busy ? "Generuju…" : "Navrhnout kartu"}
        </button>
        {message && <p className="cs-note">{message}</p>}
      </div>

      {card && (
        <div
          className="cs-panel"
          style={{
            display: "grid",
            justifyItems: "center",
            gap: "1rem",
          }}
        >
          <HsCard def={card} as="div" size="lg" />
          <div style={{ display: "flex", gap: "0.65rem", width: "100%" }}>
            <button
              type="button"
              className="cs-btn cs-btn--primary"
              style={{ flex: 1 }}
              onClick={approve}
            >
              Schválit
            </button>
            <button
              type="button"
              className="cs-btn cs-btn--ghost"
              style={{ flex: 1 }}
              onClick={() => setCard(null)}
            >
              Zahodit
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
