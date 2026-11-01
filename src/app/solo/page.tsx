"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { CardView } from "@/components/CardView";
import { HandPicker } from "@/components/HandPicker";
import { SituationBanner } from "@/components/SituationBanner";
import { VerdictBanner } from "@/components/VerdictBanner";
import { getCard, getCards, getQuiz, getSituation } from "@/lib/cards";
import { drawCard, pickSituationId, playCard, shuffle } from "@/lib/deck";
import { judgeRound } from "@/lib/judge";
import { scoreQuiz } from "@/lib/quiz";
import { loadHighScore, saveHighScore } from "@/lib/solo-storage";
import "./solo.css";

type Phase = "quiz" | "reveal-card" | "play" | "verdict" | "result";

type RoundOutcome = {
  playerCardId: string;
  npcCardIds: [string, string];
  winnerCardId: string;
  verdictText: string;
  won: boolean;
};

function drawFromDeck(
  deck: string[],
  discard: string[],
  count: number,
): { cards: string[]; deck: string[]; discard: string[] } {
  let nextDeck = [...deck];
  let nextDiscard = [...discard];
  const cards: string[] = [];

  for (let i = 0; i < count; i++) {
    if (nextDeck.length === 0) {
      nextDeck = shuffle(nextDiscard, nextDiscard.join("|") || `npc-reshuffle:${i}`);
      nextDiscard = [];
    }
    if (nextDeck.length === 0) break;
    cards.push(nextDeck.pop()!);
  }

  return { cards, deck: nextDeck, discard: nextDiscard };
}

function buildOpeningHand(starterCardId: string, seed: string) {
  const shuffledRest = shuffle(
    getCards()
      .map((c) => c.id)
      .filter((id) => id !== starterCardId),
    seed,
  );
  return {
    hand: [starterCardId, ...shuffledRest.slice(0, 3)],
    deck: shuffledRest.slice(3),
    discard: [] as string[],
  };
}

export default function SoloPage() {
  const quiz = useMemo(() => getQuiz(), []);
  const [phase, setPhase] = useState<Phase>("quiz");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [starterCardId, setStarterCardId] = useState<string | null>(null);
  const [hand, setHand] = useState<string[]>([]);
  const [deck, setDeck] = useState<string[]>([]);
  const [discard, setDiscard] = useState<string[]>([]);
  const [situationId, setSituationId] = useState<string | null>(null);
  const [usedSituationIds, setUsedSituationIds] = useState<string[]>([]);
  const [streak, setStreak] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [waiting, setWaiting] = useState(false);
  const [outcome, setOutcome] = useState<RoundOutcome | null>(null);
  const [shareNote, setShareNote] = useState<string | null>(null);
  const [round, setRound] = useState(0);
  const [quizLocked, setQuizLocked] = useState(false);
  const quizAnswerLatch = useRef(false);

  useEffect(() => {
    setHighScore(loadHighScore());
  }, []);

  // Unlock mid-quiz answers only after the next question has committed.
  useEffect(() => {
    if (phase !== "quiz") return;
    quizAnswerLatch.current = false;
    setQuizLocked(false);
  }, [phase, questionIndex]);

  function persistHighScore(nextStreak: number) {
    setHighScore((prev) => {
      const best = Math.max(prev, nextStreak);
      if (best > prev) saveHighScore(best);
      return best;
    });
  }

  function startNextRound(
    nextHand: string[],
    nextDeck: string[],
    nextDiscard: string[],
    nextStreak: number,
    nextRound: number,
    used: string[],
  ) {
    const seed = `solo:${nextStreak}:${nextRound}`;
    const nextSituationId = pickSituationId(seed, used);
    setHand(nextHand);
    setDeck(nextDeck);
    setDiscard(nextDiscard);
    setSituationId(nextSituationId);
    setUsedSituationIds([...used, nextSituationId]);
    setRound(nextRound);
    setOutcome(null);
    setWaiting(false);
    setPhase("play");
  }

  function handleQuizAnswer(answerIndex: number) {
    if (quizLocked || quizAnswerLatch.current) return;
    quizAnswerLatch.current = true;
    setQuizLocked(true);

    const nextAnswers = [...answers, answerIndex];
    setAnswers(nextAnswers);

    if (questionIndex + 1 < quiz.length) {
      // Stay locked until questionIndex effect unlocks after commit.
      setQuestionIndex((i) => i + 1);
      return;
    }

    const { cardId } = scoreQuiz(nextAnswers);
    setStarterCardId(cardId);
    setPhase("reveal-card");
  }

  function handleBeginPlay() {
    if (!starterCardId) return;
    const opening = buildOpeningHand(starterCardId, `solo:deal:${starterCardId}`);
    startNextRound(opening.hand, opening.deck, opening.discard, 0, 1, []);
  }

  function handlePick(cardId: string) {
    if (phase !== "play" || waiting || !situationId) return;

    setWaiting(true);
    const situation = getSituation(situationId);
    const afterPlay = playCard(hand, cardId);
    const npcDraw = drawFromDeck(deck, discard, 2);
    const npcCardIds = [...npcDraw.cards];

    while (npcCardIds.length < 2) {
      const fillerPool = shuffle(
        [...npcDraw.deck, ...npcDraw.discard, ...afterPlay].filter(
          (id) => id !== cardId && !npcCardIds.includes(id),
        ),
        `solo:npc-fill:${streak}:${situationId}:${npcCardIds.length}`,
      );
      if (fillerPool.length === 0) break;
      npcCardIds.push(fillerPool[0]!);
    }

    if (npcCardIds.length < 2) {
      setWaiting(false);
      return;
    }

    const rivals = [npcCardIds[0]!, npcCardIds[1]!] as [string, string];
    const seed = `solo:${streak}:${situationId}`;
    const judged = judgeRound([cardId, rivals[0], rivals[1]], situation, seed);
    const won = judged.winnerCardId === cardId;

    const nextDiscard = [...npcDraw.discard, cardId, rivals[0], rivals[1]];
    const refilled = drawCard(afterPlay, npcDraw.deck, nextDiscard);

    const nextOutcome: RoundOutcome = {
      playerCardId: cardId,
      npcCardIds: rivals,
      winnerCardId: judged.winnerCardId,
      verdictText: judged.verdictText,
      won,
    };

    window.setTimeout(() => {
      setHand(refilled.hand);
      setDeck(refilled.deck);
      setDiscard(refilled.discard);
      setOutcome(nextOutcome);
      setWaiting(false);

      if (won) {
        const nextStreak = streak + 1;
        setStreak(nextStreak);
        persistHighScore(nextStreak);
      } else {
        persistHighScore(streak);
      }
      setPhase("verdict");
    }, 700);
  }

  function handleAfterVerdict() {
    if (!outcome) return;
    if (outcome.won) {
      startNextRound(hand, deck, discard, streak, round + 1, usedSituationIds);
      return;
    }
    setPhase("result");
  }

  async function handleShare() {
    const card = starterCardId ? getCard(starterCardId) : null;
    const text = card
      ? `V solo Chovancích jsem zvládl streak ${streak}! Můj Chovanec: ${card.name}.`
      : `V solo Chovancích jsem zvládl streak ${streak}!`;

    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({ title: "Chovanci — solo", text });
        setShareNote("Sdíleno.");
        return;
      }
      await navigator.clipboard.writeText(text);
      setShareNote("Zkopírováno do schránky.");
    } catch {
      try {
        await navigator.clipboard.writeText(text);
        setShareNote("Zkopírováno do schránky.");
      } catch {
        setShareNote("Sdílení se nepovedlo.");
      }
    }
  }

  function handlePlayAgain() {
    setPhase("quiz");
    setQuestionIndex(0);
    setAnswers([]);
    setStarterCardId(null);
    setHand([]);
    setDeck([]);
    setDiscard([]);
    setSituationId(null);
    setUsedSituationIds([]);
    setStreak(0);
    setOutcome(null);
    setWaiting(false);
    setShareNote(null);
    setRound(0);
    quizAnswerLatch.current = false;
    setQuizLocked(false);
    setHighScore(loadHighScore());
  }

  const question = quiz[questionIndex];
  const situation = situationId ? getSituation(situationId) : null;
  const starter = starterCardId ? getCard(starterCardId) : null;

  return (
    <main className="solo">
      <Link className="solo__back" href="/">
        ← Domů
      </Link>

      <header className="solo__header">
        <h1 className="solo__title">Solo</h1>
        <p className="solo__meta">
          Rekord: {highScore}
          {phase !== "quiz" && phase !== "reveal-card" ? ` · Streak: ${streak}` : null}
        </p>
      </header>

      {phase === "quiz" && question && (
        <section aria-live="polite">
          <p className="solo__meta">
            Otázka {questionIndex + 1} / {quiz.length}
          </p>
          <p className="solo__prompt">{question.prompt}</p>
          <div className="solo__answers">
            {question.answers.map((answer, index) => (
              <button
                key={`${question.id}-${index}`}
                type="button"
                className="solo__answer"
                disabled={quizLocked}
                onClick={() => handleQuizAnswer(index)}
              >
                {answer.label}
              </button>
            ))}
          </div>
        </section>
      )}

      {phase === "reveal-card" && starter && (
        <section className="solo__center" aria-live="polite">
          <p className="solo__prompt">Tvůj startovní Chovanec</p>
          <CardView cardId={starter.id} selected />
          <p className="solo__flavor">{starter.flavor}</p>
          <div className="solo__actions">
            <button type="button" className="solo__btn solo__btn--green" onClick={handleBeginPlay}>
              Do situací
            </button>
          </div>
        </section>
      )}

      {phase === "play" && situation && (
        <section aria-live="polite">
          <div className="solo__streak">
            <span>Streak {streak}</span>
            <span>Rekord {highScore}</span>
          </div>
          <SituationBanner text={situation.text} />
          {waiting ? (
            <p className="solo__waiting">Soudce rozhoduje…</p>
          ) : (
            <>
              <p className="solo__hint">Vyber jednu kartu z ruky. Proti tobě jdou 2 náhodní rivalové.</p>
              <HandPicker cardIds={hand} disabled={waiting} onPick={handlePick} />
            </>
          )}
        </section>
      )}

      {phase === "verdict" && outcome && (
        <section aria-live="polite">
          <div className="solo__streak">
            <span>Streak {streak}</span>
            <span>Rekord {highScore}</span>
          </div>
          {situation && <SituationBanner text={situation.text} />}
          <VerdictBanner text={outcome.verdictText} winnerCardId={outcome.winnerCardId} />
          <div className="solo__npcs" aria-label="Karty kola">
            <p className="solo__npc-label">Ty vs rivalové</p>
            <CardView cardId={outcome.playerCardId} compact selected={outcome.won} />
            <CardView
              cardId={outcome.npcCardIds[0]}
              compact
              selected={!outcome.won && outcome.winnerCardId === outcome.npcCardIds[0]}
            />
            <CardView
              cardId={outcome.npcCardIds[1]}
              compact
              selected={!outcome.won && outcome.winnerCardId === outcome.npcCardIds[1]}
            />
          </div>
          <p className="solo__hint">
            {outcome.won ? "Vyhráls kolo — streak roste." : "Prohráls kolo — jdeme na výsledek."}
          </p>
          <div className="solo__actions">
            <button type="button" className="solo__btn" onClick={handleAfterVerdict}>
              {outcome.won ? "Další situace" : "Zobrazit výsledek"}
            </button>
          </div>
        </section>
      )}

      {phase === "result" && (
        <section className="solo__center" aria-live="polite">
          <p className="solo__prompt">Konec streaku</p>
          <p className="solo__meta">
            Streak {streak} · Rekord {highScore}
          </p>
          {starter && (
            <>
              <CardView cardId={starter.id} selected />
              <p className="solo__flavor">{starter.flavor}</p>
            </>
          )}
          {outcome && (
            <VerdictBanner text={outcome.verdictText} winnerCardId={outcome.winnerCardId} />
          )}
          <div className="solo__actions">
            <button type="button" className="solo__btn solo__btn--green" onClick={handleShare}>
              Sdílet výsledek
            </button>
            <button type="button" className="solo__btn solo__btn--secondary" onClick={handlePlayAgain}>
              Hrát znovu
            </button>
          </div>
          {shareNote && <p className="solo__hint">{shareNote}</p>}
        </section>
      )}
    </main>
  );
}
