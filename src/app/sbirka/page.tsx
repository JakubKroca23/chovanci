import Link from "next/link";
import { CardView } from "@/components/CardView";
import { getCards } from "@/lib/cards";

export default function SbirkaPage() {
  const cards = getCards();

  return (
    <main className="sbirka">
      <header className="sbirka__header">
        <Link className="sbirka__back" href="/">
          ← Domů
        </Link>
        <h1 className="sbirka__title">Sbírka</h1>
        <p className="sbirka__intro">Všech 16 Chovanců — jméno, obrázek a chuť karty.</p>
      </header>

      <div className="sbirka__grid">
        {cards.map((card) => (
          <article key={card.id} className="sbirka__item">
            <CardView cardId={card.id} />
            <p className="sbirka__flavor">{card.flavor}</p>
          </article>
        ))}
      </div>
    </main>
  );
}
