/** Official decorative card palette — one source of truth for all pages.
 *  Colours are pastel backgrounds (light + dark variants co-located).
 *  Use `cardBgColor(id)` to get a stable colour for any entity by its id. */
export const CARD_BG_COLORS = [
  "bg-amber-100 dark:bg-amber-950/40",
  "bg-rose-100 dark:bg-rose-950/40",
  "bg-orange-100 dark:bg-orange-950/40",
  "bg-emerald-100 dark:bg-emerald-950/40",
  "bg-violet-100 dark:bg-violet-950/40",
  "bg-sky-100 dark:bg-sky-950/40",
];

export function cardBgColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) & 0xffff;
  }
  return CARD_BG_COLORS[hash % CARD_BG_COLORS.length];
}
