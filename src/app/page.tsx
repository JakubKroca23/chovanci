import Link from "next/link";

export default function Home() {
  return (
    <main className="home">
      <header className="home__brand">
        <h1 className="home__title">Chovanci</h1>
        <p className="home__subtitle">
          Situace padne na stůl. Vyber svého Chovance. Soudce rozhodne.
        </p>
      </header>

      <nav className="home__actions" aria-label="Hlavní menu">
        <Link className="home__btn home__btn--solo" href="/solo">
          Solo
        </Link>
        <Link className="home__btn home__btn--create" href="/multi?mode=create">
          Vytvořit místnost
        </Link>
        <Link className="home__btn home__btn--join" href="/multi?mode=join">
          Připojit se
        </Link>
        <Link className="home__btn home__btn--collection" href="/sbirka">
          Sbírka
        </Link>
      </nav>

      <p className="home__hint">Mobilní párty hra — 16 karet, jeden verdikt.</p>
    </main>
  );
}
