import Image from "next/image";
import { getCard } from "@/lib/cards";

type CardViewProps = {
  cardId: string;
  selected?: boolean;
  compact?: boolean;
};

export function CardView({ cardId, selected = false, compact = false }: CardViewProps) {
  const card = getCard(cardId);
  const width = compact ? 96 : 148;
  const height = compact ? 136 : 210;

  return (
    <article
      className={[
        "card-view",
        compact ? "card-view--compact" : "",
        selected ? "card-view--selected" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ ["--card-accent" as string]: card.color }}
      aria-label={card.name}
      data-selected={selected ? "true" : undefined}
    >
      <div className="card-view__frame">
        <Image
          src={card.image}
          alt={card.name}
          width={width}
          height={height}
          className="card-view__image"
          sizes={compact ? "96px" : "(max-width: 640px) 40vw, 148px"}
          priority={false}
        />
      </div>
      {!compact && (
        <p className="card-view__name" style={{ color: card.color }}>
          {card.name}
        </p>
      )}
    </article>
  );
}
