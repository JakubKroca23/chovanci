type ScoreBoardProps = {
  players: { name: string; score: number }[];
};

export function ScoreBoard({ players }: ScoreBoardProps) {
  const ranked = [...players].sort((a, b) => b.score - a.score);

  return (
    <section className="scoreboard" aria-label="Skóre">
      <h2 className="scoreboard__title">Skóre</h2>
      <ol className="scoreboard__list">
        {ranked.map((player, index) => (
          <li key={`${player.name}-${index}`} className="scoreboard__row">
            <span className="scoreboard__rank">{index + 1}.</span>
            <span className="scoreboard__name">{player.name}</span>
            <span className="scoreboard__score">{player.score}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
