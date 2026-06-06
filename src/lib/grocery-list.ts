// Unambiguous SI conversions only — tsp/tbsp/cup are culturally variable and left as-is
const METRIC_CONVERSIONS: Record<string, { canonical: string; factor: number }> = {
  kg: { canonical: "g", factor: 1000 },
  l: { canonical: "ml", factor: 1000 },
  litre: { canonical: "ml", factor: 1000 },
  litres: { canonical: "ml", factor: 1000 },
  liter: { canonical: "ml", factor: 1000 },
  liters: { canonical: "ml", factor: 1000 },
};

// Size qualifiers stripped from the leading word of a multi-word unit
const SIZE_QUALIFIERS = new Set([
  "fat", "small", "large", "big", "heaped", "rounded",
  "level", "generous", "thick", "thin", "whole",
]);

// Informal unit spellings and aliases mapped to a canonical form
const UNIT_ALIASES: Record<string, string> = {
  handful: "bunch",
  handfuls: "bunch",
  bunches: "bunch",
  cloves: "clove",
  sprigs: "sprig",
  slices: "slice",
  pieces: "piece",
  grams: "g",
  kilograms: "kg",
  milliliters: "ml",
  millilitres: "ml",
  tablespoons: "tbsp",
  teaspoons: "tsp",
  cups: "cup",
};

export function normalizeUnit(unit: string): { canonical: string; factor: number } {
  const u = unit.trim().toLowerCase();

  // Tier 1: unambiguous metric conversion (kg→g, l→ml)
  if (METRIC_CONVERSIONS[u]) return METRIC_CONVERSIONS[u];

  // Tier 2a: strip leading size qualifier from multi-word units ("small bunch"→"bunch", "fat clove"→"clove")
  const words = u.split(/\s+/);
  const base =
    words.length > 1 && SIZE_QUALIFIERS.has(words[0]) ? words.slice(1).join(" ") : u;

  // Tier 2b: spelling / alias normalisation (handfuls→bunch, cloves→clove, etc.)
  return { canonical: UNIT_ALIASES[base] ?? base, factor: 1 };
}
