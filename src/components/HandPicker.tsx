"use client";

import { getCard } from "@/lib/cards";
import { CardView } from "./CardView";

type HandPickerProps = {
  cardIds: string[];
  disabled?: boolean;
  onPick: (cardId: string) => void;
};

export function HandPicker({ cardIds, disabled = false, onPick }: HandPickerProps) {
  if (cardIds.length === 0) {
    return (
      <p className="hand-picker__empty" role="status">
        Ruka je prázdná.
      </p>
    );
  }

  return (
    <ul className="hand-picker" aria-label="Tvoje ruka">
      {cardIds.map((cardId) => {
        const card = getCard(cardId);
        return (
          <li key={cardId} className="hand-picker__item">
            <button
              type="button"
              className="hand-picker__btn"
              disabled={disabled}
              onClick={() => onPick(cardId)}
              aria-label={`Vybrat ${card.name}`}
            >
              <CardView cardId={cardId} compact />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
