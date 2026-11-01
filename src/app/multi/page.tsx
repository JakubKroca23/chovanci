"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState, type FormEvent } from "react";
import { generateRoomCode } from "@/lib/multi-client";

function MultiEntryInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") === "join" ? "join" : "create";

  const prefillCode = (searchParams.get("code") ?? "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 4);

  const [name, setName] = useState("");
  const [code, setCode] = useState(prefillCode);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const title = useMemo(
    () => (mode === "join" ? "Připojit se k duelu" : "Otevřít arénu"),
    [mode],
  );

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Zadej jméno.");
      return;
    }

    if (mode === "create") {
      const room = generateRoomCode();
      setSubmitting(true);
      router.push(`/duel/${room}?name=${encodeURIComponent(trimmedName)}`);
      return;
    }

    const room = code.trim().toUpperCase().replace(/[^A-Z]/g, "");
    if (room.length !== 4) {
      setError("Kód místnosti musí mít 4 písmena.");
      return;
    }

    setSubmitting(true);
    router.push(`/duel/${room}?name=${encodeURIComponent(trimmedName)}`);
  }

  return (
    <main className="cs-page" style={{ maxWidth: "30rem" }}>
      <Link className="cs-back" href="/">
        ← Domů
      </Link>
      <h1 className="cs-page__title">{title}</h1>
      <p className="cs-page__lead">
        {mode === "join"
          ? "Zadej čtyřpísmenný kód a své bojové jméno."
          : "Zvol jméno — kód arény se vygeneruje hned."}
      </p>

      <form
        className="cs-panel"
        onSubmit={handleSubmit}
        style={{ display: "grid", gap: "1rem" }}
      >
        <label className="cs-field">
          Jméno
          <input
            className="cs-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={24}
            autoComplete="nickname"
            placeholder="Např. Ada"
            required
          />
        </label>

        {mode === "join" && (
          <label className="cs-field">
            Kód místnosti
            <input
              className="cs-input"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={4}
              autoComplete="off"
              placeholder="ABCD"
              required
              style={{
                letterSpacing: "0.28em",
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                textAlign: "center",
                fontSize: "1.25rem",
              }}
            />
          </label>
        )}

        {error && (
          <p className="cs-note" style={{ color: "#ffb4a8" }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          className={`cs-btn cs-btn--block ${mode === "join" ? "cs-btn--primary" : "cs-btn--ember"}`}
          disabled={submitting}
        >
          {submitting
            ? "Přesměrovávám…"
            : mode === "join"
              ? "Vstoupit"
              : "Vytvořit duel"}
        </button>
        <Link
          className="cs-btn cs-btn--ghost cs-btn--block"
          href={mode === "join" ? "/multi?mode=create" : "/multi?mode=join"}
        >
          {mode === "join" ? "Spíš vytvořit místnost" : "Spíš se připojit"}
        </Link>
      </form>
    </main>
  );
}

export default function MultiEntryPage() {
  return (
    <Suspense
      fallback={
        <main className="cs-page">
          <p className="cs-note">Načítám…</p>
        </main>
      }
    >
      <MultiEntryInner />
    </Suspense>
  );
}
