/** Portrait crop when available; falls back to full card art. */
export function portraitSrc(art: string): string {
  if (!art.startsWith("/cards/")) return art;
  if (art.includes("/portraits/")) return art;
  const file = art.replace("/cards/", "");
  return `/cards/portraits/${file}`;
}
