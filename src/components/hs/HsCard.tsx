"use client";

import { portraitSrc } from "@/lib/hs/art";
import type { HsCardDef } from "@/lib/hs/types";
import "./hs-ui.css";

type Props = {
  def: HsCardDef;
  size?: "sm" | "md" | "lg";
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  as?: "button" | "div";
  showText?: boolean;
  overrideAtk?: number;
  overrideHp?: number;
};

export function HsCard({
  def,
  size = "md",
  selected,
  disabled,
  onClick,
  as = "button",
  showText = true,
  overrideAtk,
  overrideHp,
}: Props) {
  const cls = [
    "hs-card",
    size === "sm" ? "hs-card--sm" : "",
    size === "lg" ? "hs-card--lg" : "",
    selected ? "hs-card--selected" : "",
    def.rarity === "legendary" ? "hs-card--legendary" : "",
    def.rarity === "epic" ? "hs-card--epic" : "",
    def.rarity === "rare" ? "hs-card--rare" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const atk = overrideAtk ?? def.attack;
  const hp = overrideHp ?? def.health;
  const showCombat =
    def.type === "minion" || def.type === "weapon"
      ? atk != null && hp != null
      : false;

  const inner = (
    <>
      <div className="hs-card__frame" aria-hidden />
      <div className="hs-card__art">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={portraitSrc(def.art)} alt="" />
      </div>
      <span className="hs-card__cost">{def.cost}</span>
      <div className="hs-card__nameplate">
        <p className="hs-card__name">{def.name}</p>
      </div>
      {showText && <p className="hs-card__text">{def.text}</p>}
      {showCombat && (
        <>
          <span className="hs-card__atk">{atk}</span>
          <span className="hs-card__hp">{hp}</span>
        </>
      )}
      {!showCombat && <span className="hs-card__type">{def.type}</span>}
    </>
  );

  if (as === "div") {
    return (
      <div className={cls} role="img" aria-label={def.name}>
        {inner}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={cls}
      disabled={disabled}
      onClick={onClick}
      aria-label={`${def.name}, mana ${def.cost}`}
    >
      {inner}
    </button>
  );
}
