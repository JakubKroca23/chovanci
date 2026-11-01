const HIGH_SCORE_KEY = "chovanci.solo.highScore";

export function loadHighScore(): number {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(HIGH_SCORE_KEY);
  if (raw == null) return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

export function saveHighScore(n: number): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(HIGH_SCORE_KEY, String(n));
}
