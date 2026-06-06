import { getIngredientEmoji } from "./ingredient-emoji";

// Derive a recipe emoji from its ingredients' canonical English names.
// Falls back to 🍳 when no ingredient keyword matches.
export function getRecipeEmoji(ingredientNames: string[]): string {
  for (const name of ingredientNames) {
    const emoji = getIngredientEmoji(name, "other");
    if (emoji !== "🛒") return emoji;
  }
  return "🍳";
}
