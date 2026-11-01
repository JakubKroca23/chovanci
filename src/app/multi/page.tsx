"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState, type FormEvent } from "react";
import { generateRoomCode } from "@/lib/multi-client";
import "./multi.css";

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
    () => (mode === "join" ? "Připojit se" : "Vytvořit místnost"),
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
      router.push(
        `/multi/${room}?host=1&name=${encodeURIComponent(trimmedName)}`,
      );
      return;
    }

    const room = code.trim().toUpperCase().replace(/[^A-Z]/g, "");
    if (room.length !== 4) {
      setError("Kód místnosti musí mít 4 písmena.");
      return;
    }

    setSubmitting(true);
    router.push(`/multi/${room}?name=${encodeURIComponent(trimmedName)}`);
  }

  return (
    <main className="multi">
      <Link className="multi__back" href="/">
        ← Domů
      </Link>

      <header className="multi__header">
        <h1 className="multi__title">{title}</h1>
        <p className="multi__meta">
          {mode === "join"
            ? "Zadej kód místnosti a své jméno."
            : "Zvol jméno — kód místnosti se vygeneruje."}
        </p>
      </header>

      <form className="multi__form" onSubmit={handleSubmit}>
        <label className="multi__label">
          Jméno
          <input
            className="multi__input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={24}
            autoComplete="nickname"
            placeholder="Např. Ada"
            required
          />
        </label>

        {mode === "join" && (
          <label className="multi__label">
            Kód místnosti
            <input
              className="multi__input multi__input--code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={4}
              autoComplete="off"
              placeholder="ABCD"
              required
            />
          </label>
        )}

        {error && <p className="multi__error">{error}</p>}

        <div className="multi__actions">
          <button
            type="submit"
            className={`multi__btn ${mode === "join" ? "multi__btn--blue" : "multi__btn--green"}`}
            disabled={submitting}
          >
            {submitting
              ? "Přesměrovávám…"
              : mode === "join"
                ? "Vstoupit"
                : "Vytvořit"}
          </button>
          <Link
            className="multi__btn multi__btn--secondary"
            href={mode === "join" ? "/multi?mode=create" : "/multi?mode=join"}
          >
            {mode === "join" ? "Spíš vytvořit místnost" : "Spíš se připojit"}
          </Link>
        </div>
      </form>
    </main>
  );
}

export default function MultiEntryPage() {
  return (
    <Suspense
      fallback={
        <main className="multi">
          <p className="multi__waiting">Načítám…</p>
        </main>
      }
    >
      <MultiEntryInner />
    </Suspense>
  );
}
