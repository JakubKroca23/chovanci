import Link from "next/link";
import { HsCard } from "@/components/hs/HsCard";
import { getCardDef } from "@/lib/hs/cards";

export default function Home() {
  const a = getCardDef("chovanec");
  const b = getCardDef("dochovanec");
  const c = getCardDef("prezivanec");

  return (
    <main className="home-cs">
      <div className="home-cs__stage" aria-hidden>
        <picture>
          <source media="(min-width: 900px)" srcSet="/ui/home-wide.jpg" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/ui/home-portrait.jpg" alt="" />
        </picture>
        <div className="home-cs__veil" />
      </div>

      <div className="home-cs__float-mobile" aria-hidden>
        <HsCard def={a} as="div" size="sm" showText={false} />
      </div>

      <div className="home-cs__content">
        <header>
          <p className="home-cs__eyebrow">propoj.app · fantasy arena</p>
          <h1 className="home-cs__brand">
            Chovanec
            <span>Stone</span>
          </h1>
          <p className="home-cs__tag">
            Vstup do arény. Stavěj deck, volej miniony a rozhodni souboj 1v1 —
            proti botovi nebo kamarádovi.
          </p>
        </header>

        <nav className="home-cs__cta" aria-label="Hlavní akce">
          <Link className="cs-btn cs-btn--primary cs-btn--block" href="/play">
            Vstoupit do arény
          </Link>
          <Link className="cs-btn cs-btn--ember cs-btn--block" href="/multi?mode=create">
            Vytvořit duel
          </Link>
          <Link className="cs-btn cs-btn--ghost cs-btn--block" href="/multi?mode=join">
            Připojit se kódem
          </Link>
        </nav>

        <div className="home-cs__secondary">
          <Link href="/decks">Decky</Link>
          <Link href="/sbirka">Sbírka</Link>
          <Link href="/generator">Generátor</Link>
        </div>
      </div>

      <aside className="home-cs__showcase" aria-hidden>
        <div className="home-cs__showcase-inner">
          <HsCard def={a} as="div" size="lg" showText={false} />
          <HsCard def={b} as="div" size="md" showText={false} />
          <HsCard def={c} as="div" size="sm" showText={false} />
        </div>
      </aside>
    </main>
  );
}
