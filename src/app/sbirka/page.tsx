"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { HsCard } from "@/components/hs/HsCard";
import { getCoreCards } from "@/lib/hs/cards";
import { loadGeneratedCards } from "@/lib/hs/storage";
import type { HsCardDef } from "@/lib/hs/types";

export default function SbirkaPage() {
  const [cards, setCards] = useState<HsCardDef[]>([]);

  useEffect(() => {
    setCards([...getCoreCards(), ...loadGeneratedCards()]);
  }, []);

  return (
    <main className="cs-page">
      <Link className="cs-back" href="/">
        ← Domů
      </Link>
      <h1 className="cs-page__title">Sbírka</h1>
      <p className="cs-page__lead">
        {cards.length} karet — core set a schválené výtvory z generátoru.
      </p>
      <div className="hs-grid">
        {cards.map((card) => (
          <HsCard key={card.id} def={card} as="div" size="md" />
        ))}
      </div>
    </main>
  );
}
