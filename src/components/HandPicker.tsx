"use client";

import { getCard } from "@/lib/cards";
import { CardView } from "./CardView";

type HandPickerProps = {
  cardIds: string[];
  disabled?: boolean;
  onPick: (cardId: string) => void;
};

export function HandPicker({ cardIds, disabled = false, onPick }: HandPickerProps) {
  return (
    <div className="hand-picker" role="list" aria-label="Tvoje ruka">
      {cardIds.map((cardId) => {
        const card = getCard(cardId);
        return (
          <button
            key={cardId}
            type="button"
            role="listitem"
            className="hand-picker__btn"
            disabled={disabled}
            onClick={() => onPick(cardId)}
            aria-label={`Vybrat ${card.name}`}
          >
            <CardView cardId={cardId} compact />
          </button>
        );
      })}
    </div>
  );
}
