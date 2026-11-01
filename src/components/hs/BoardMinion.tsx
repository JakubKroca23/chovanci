"use client";

import { portraitSrc } from "@/lib/hs/art";
import { getCardDef } from "@/lib/hs/cards";
import type { BoardMinion as BoardMinionType, HsCardDef } from "@/lib/hs/types";
import "./hs-ui.css";

type Props = {
  minion: BoardMinionType;
  extra?: HsCardDef[];
  selected?: boolean;
  ready?: boolean;
  disabled?: boolean;
  onClick?: () => void;
};

export function BoardMinionView({
  minion,
  extra = [],
  selected,
  ready,
  disabled,
  onClick,
}: Props) {
  const def = getCardDef(minion.cardId, extra);
  const taunt = minion.keywords.includes("taunt");
  const cls = [
    "hs-minion",
    selected ? "hs-minion--selected" : "",
    ready ? "hs-minion--ready" : "",
    taunt ? "hs-minion--taunt" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={cls}
      disabled={disabled}
      onClick={onClick}
      aria-label={`${def.name} ${minion.attack}/${minion.health}`}
      title={def.name}
    >
      <div className="hs-minion__body">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={portraitSrc(def.art)} alt="" />
      </div>
      <span className="hs-minion__atk">{minion.attack}</span>
      <span className="hs-minion__hp">{minion.health}</span>
    </button>
  );
}
