export type CardTag =
  | "chaos"
  | "styl"
  | "preziti"
  | "romance"
  | "prace"
  | "konspirace"
  | "detsky"
  | "formal"
  | "spinavy"
  | "ukryt"
  | "nadseni"
  | "rytir"
  | "pes"
  | "pochybnost"
  | "zaklad";

export type Card = {
  id: string;
  name: string;
  color: string;
  image: string;
  flavor: string;
  stats: { icon: string; value: number }[];
  tags: CardTag[];
};

export type SituationPack = "mix" | "prace" | "rodina" | "patek";

export type Situation = {
  id: string;
  text: string;
  tags: CardTag[];
  mood?: "work" | "party" | "crisis" | "love" | "family" | "random";
  /** Content pack. Mode `mix` draws from all packs. */
  pack?: SituationPack;
};

export type VerdictLine = {
  id: string;
  tags: CardTag[];
  moods?: Situation["mood"][];
  text: string;
};

export type QuizAnswer = {
  label: string;
  weights: Partial<Record<CardTag, number>>;
};

export type QuizQuestion = {
  id: string;
  prompt: string;
  answers: QuizAnswer[];
};

export type MatchPhase = "lobby" | "pick" | "reveal" | "verdict" | "final";

export type MatchPlayer = {
  id: string;
  name: string;
  score: number;
};

export type MatchState = {
  code: string;
  hostId: string;
  players: MatchPlayer[];
  round: number;
  phase: MatchPhase;
  /** Selected situation pack for this match. */
  pack: SituationPack;
  situationId: string | null;
  /** Situation ids already used this match (anti-repeat across rounds). */
  usedSituationIds: string[];
  plays: Record<string, string>;
  winnerId: string | null;
  verdictText: string | null;
  hands: Record<string, string[]>;
  deck: string[];
  discard: string[];
};
