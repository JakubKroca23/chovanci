import Link from "next/link";
import { HsCard } from "@/components/hs/HsCard";
import { getCardDef } from "@/lib/hs/cards";

export default function Home() {
  const showcaseA = getCardDef("chovanec");
  const showcaseB = getCardDef("prezivanec");

  return (
    <main className="home-cs">
      <div className="home-cs__stage" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/ui/board-hero.jpg" alt="" />
        <div className="home-cs__veil" />
      </div>

      <div className="home-cs__float" aria-hidden>
        <HsCard def={showcaseA} as="div" size="md" showText={false} />
      </div>
      <div className="home-cs__float home-cs__float--b" aria-hidden>
        <HsCard def={showcaseB} as="div" size="sm" showText={false} />
      </div>

      <div className="home-cs__content">
        <header>
          <p className="home-cs__eyebrow">propoj.app</p>
          <h1 className="home-cs__brand">
            Chovanec
            <span>Stone</span>
          </h1>
          <p className="home-cs__tag">
            Souboj 1v1 na zeleném stole — minioni, spelly, hero power a tvoji
            Chovanci.
          </p>
        </header>

        <nav className="home-cs__cta" aria-label="Hlavní akce">
          <Link className="cs-btn cs-btn--primary cs-btn--block" href="/play">
            Hrát vs bot
          </Link>
          <Link className="cs-btn cs-btn--ember cs-btn--block" href="/multi?mode=create">
            Vytvořit 1v1 místnost
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
    </main>
  );
}
