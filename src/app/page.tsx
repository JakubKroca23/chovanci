import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-6 px-4 py-10">
      <header className="text-center">
        <p className="text-sm tracking-[0.2em] uppercase opacity-70">propoj.app</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl font-bold">
          ChovanecStone
        </h1>
        <p className="mt-3 text-base opacity-80">
          Hearthstone s Chovanci — souboj 1v1, decky a generátor karet.
        </p>
      </header>

      <nav className="flex flex-col gap-3">
        <Link
          className="rounded-2xl bg-[var(--accent-green,#2f6b4f)] px-4 py-3 text-center text-lg font-semibold text-white"
          href="/play"
        >
          Hrát vs bot
        </Link>
        <Link
          className="rounded-2xl bg-[#3d2b1f] px-4 py-3 text-center font-semibold text-white"
          href="/multi?mode=create"
        >
          1v1 — vytvořit místnost
        </Link>
        <Link
          className="rounded-2xl border border-black/15 px-4 py-3 text-center font-semibold"
          href="/multi?mode=join"
        >
          1v1 — připojit se
        </Link>
        <Link className="rounded-2xl border border-black/15 px-4 py-3 text-center" href="/decks">
          Decky
        </Link>
        <Link className="rounded-2xl border border-black/15 px-4 py-3 text-center" href="/sbirka">
          Sbírka
        </Link>
        <Link
          className="rounded-2xl border border-black/15 px-4 py-3 text-center"
          href="/generator"
        >
          Generátor karet
        </Link>
      </nav>
    </main>
  );
}
