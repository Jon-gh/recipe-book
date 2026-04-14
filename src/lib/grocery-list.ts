export type GroceryItem = { name: string; quantity: number; unit: string; category: string };

export type MealPlanEntryWithRecipe = {
  targetServings: number;
  recipe: {
    servings: number;
    ingredients: { name: string; quantity: number; unit: string; category: string }[];
  };
};

// Ingredients that should never appear on a shopping list
const TRIVIAL_INGREDIENTS = new Set(["water"]);

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

function normalizeUnit(unit: string): { canonical: string; factor: number } {
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

export function aggregateGroceryList(entries: MealPlanEntryWithRecipe[]): GroceryItem[] {
  const aggregated = new Map<string, GroceryItem>();

  for (const entry of entries) {
    const factor = entry.targetServings / entry.recipe.servings;

    for (const ing of entry.recipe.ingredients) {
      if (TRIVIAL_INGREDIENTS.has(ing.name.trim().toLowerCase())) continue;

      const { canonical, factor: unitFactor } = normalizeUnit(ing.unit);
      const key = `${ing.name.toLowerCase()}__${canonical}`;
      const scaled = Math.round(ing.quantity * factor * unitFactor * 1000) / 1000;

      if (aggregated.has(key)) {
        aggregated.get(key)!.quantity += scaled;
      } else {
        aggregated.set(key, { name: ing.name, quantity: scaled, unit: canonical, category: ing.category });
      }
    }
  }

  return Array.from(aggregated.values()).sort((a, b) => a.name.localeCompare(b.name));
}
