/** Prefer painted HS art; fall back to portrait crop / original. */
export function portraitSrc(art: string): string {
  if (!art) return "/cards/hs/chovanec.jpg";
  if (art.startsWith("/cards/hs/")) return art;
  if (art.includes("/portraits/")) return art;
  if (art.startsWith("/cards/")) {
    const file = art.replace("/cards/", "");
    return `/cards/hs/${file}`;
  }
  return art;
}
