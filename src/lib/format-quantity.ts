const FRACTIONS: [number, string][] = [
  [1 / 8, "⅛"],
  [1 / 4, "¼"],
  [3 / 8, "⅜"],
  [1 / 2, "½"],
  [5 / 8, "⅝"],
  [2 / 3, "⅔"],
  [3 / 4, "¾"],
  [7 / 8, "⅞"],
  [1 / 3, "⅓"],
];

/** Round value to nearest 0.25 step, then format as a whole + unicode fraction. */
export function formatQuantity(value: number): string {
  if (value <= 0) return "0";

  // Round to nearest 0.25
  const rounded = Math.round(value * 4) / 4;
  const whole = Math.floor(rounded);
  const frac = Math.round((rounded - whole) * 1000) / 1000;

  if (frac === 0) return String(whole);

  const match = FRACTIONS.find(([f]) => Math.abs(f - frac) < 0.01);
  const fracStr = match ? match[1] : `${Math.round(frac * 100) / 100}`;

  return whole === 0 ? fracStr : `${whole}${fracStr}`;
}

/** Scale a quantity from baseServings to targetServings, then format. */
export function scaleQuantity(
  quantity: number,
  baseServings: number,
  targetServings: number
): string {
  if (baseServings === 0) return formatQuantity(quantity);
  return formatQuantity((quantity * targetServings) / baseServings);
}
