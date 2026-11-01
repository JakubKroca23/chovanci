type SituationBannerProps = {
  text: string;
};

export function SituationBanner({ text }: SituationBannerProps) {
  return (
    <section className="situation-banner" aria-live="polite">
      <p className="situation-banner__label">Situace</p>
      <p className="situation-banner__text">{text}</p>
    </section>
  );
}
