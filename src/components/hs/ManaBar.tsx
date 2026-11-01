import "./hs-ui.css";

type Props = {
  mana: number;
  maxMana: number;
};

export function ManaBar({ mana, maxMana }: Props) {
  const crystals = Array.from({ length: Math.max(maxMana, 0) }, (_, i) => i < mana);
  return (
    <div className="hs-mana" aria-label={`Mana ${mana} z ${maxMana}`}>
      {crystals.map((on, i) => (
        <span
          key={i}
          className={`hs-mana__crystal${on ? " hs-mana__crystal--on" : ""}`}
        />
      ))}
      <span className="hs-mana__label">
        {mana}/{maxMana}
      </span>
    </div>
  );
}
