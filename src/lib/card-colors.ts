/** Official decorative card palette — one source of truth for all pages.
 *  Colours are pastel backgrounds (light + dark variants co-located).
 *  Use `cardBgColor(id)` to get a stable colour for any entity by its id. */
export const CARD_BG_COLORS = [
  "bg-amber-50 dark:bg-amber-950/30",
  "bg-rose-50 dark:bg-rose-950/30",
  "bg-orange-50 dark:bg-orange-950/30",
  "bg-emerald-50 dark:bg-emerald-950/30",
  "bg-violet-50 dark:bg-violet-950/30",
  "bg-sky-50 dark:bg-sky-950/30",
];

export function cardBgColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) & 0xffff;
  }
  return CARD_BG_COLORS[hash % CARD_BG_COLORS.length];
}
