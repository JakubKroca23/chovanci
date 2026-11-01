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
  const className = [
    "card-view",
    compact ? "card-view--compact" : "",
    selected ? "card-view--selected" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const style = { ["--card-accent" as string]: card.color };
  const frame = (
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
  );

  // Compact cards sit inside buttons/lists — avoid nested <article>.
  if (compact) {
    return (
      <div
        className={className}
        style={style}
        aria-label={card.name}
        data-selected={selected ? "true" : undefined}
      >
        {frame}
      </div>
    );
  }

  return (
    <article
      className={className}
      style={style}
      aria-label={card.name}
      data-selected={selected ? "true" : undefined}
    >
      {frame}
      <p className="card-view__name" style={{ color: card.color }}>
        {card.name}
      </p>
    </article>
  );
}
