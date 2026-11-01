"use client";

import { portraitSrc } from "@/lib/hs/art";
import { HEROES } from "@/lib/hs/cards";
import type { HeroId } from "@/lib/hs/types";
import "./hs-ui.css";

type Props = {
  name: string;
  heroId: HeroId;
  hp: number;
  armor?: number;
  subtitle?: string;
};

export function HeroPlate({ name, heroId, hp, armor = 0, subtitle }: Props) {
  const hero = HEROES.find((h) => h.id === heroId);
  return (
    <div className="hs-hero">
      <div className="hs-hero__portrait">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={portraitSrc(hero?.art ?? "/cards/hs/chovanec.jpg")} alt="" />
      </div>
      <div>
        <p className="hs-hero__name">{name}</p>
        <p className="hs-hero__meta">{subtitle ?? hero?.name ?? heroId}</p>
      </div>
      <div className="hs-hero__vitals">
        <div className="hs-vital hs-vital--hp">
          <span>HP</span>
          {hp}
        </div>
        {armor > 0 && (
          <div className="hs-vital hs-vital--armor">
            <span>Armor</span>
            {armor}
          </div>
        )}
      </div>
    </div>
  );
}
