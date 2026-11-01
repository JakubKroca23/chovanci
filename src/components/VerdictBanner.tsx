import { CardView } from "./CardView";
import { getCard } from "@/lib/cards";

type VerdictBannerProps = {
  text: string;
  winnerCardId: string;
};

export function VerdictBanner({ text, winnerCardId }: VerdictBannerProps) {
  const winner = getCard(winnerCardId);

  return (
    <section
      className="verdict-banner"
      style={{ ["--card-accent" as string]: winner.color }}
      aria-live="polite"
    >
      <p className="verdict-banner__label">Verdikt</p>
      <div className="verdict-banner__body">
        <CardView cardId={winnerCardId} compact selected />
        <div className="verdict-banner__copy">
          <p className="verdict-banner__winner">{winner.name}</p>
          <p className="verdict-banner__text">{text}</p>
        </div>
      </div>
    </section>
  );
}
