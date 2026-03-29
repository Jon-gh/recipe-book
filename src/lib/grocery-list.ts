export type GroceryItem = { name: string; quantity: number; unit: string };

export type MealPlanEntryWithRecipe = {
  targetServings: number;
  recipe: {
    servings: number;
    ingredients: { name: string; quantity: number; unit: string }[];
  };
};

export function aggregateGroceryList(entries: MealPlanEntryWithRecipe[]): GroceryItem[] {
  const aggregated = new Map<string, GroceryItem>();

  for (const entry of entries) {
    const factor = entry.targetServings / entry.recipe.servings;

    for (const ing of entry.recipe.ingredients) {
      const key = `${ing.name.toLowerCase()}__${ing.unit.toLowerCase()}`;
      const scaled = Math.round(ing.quantity * factor * 1000) / 1000;

      if (aggregated.has(key)) {
        aggregated.get(key)!.quantity += scaled;
      } else {
        aggregated.set(key, { name: ing.name, quantity: scaled, unit: ing.unit });
      }
    }
  }

  return Array.from(aggregated.values()).sort((a, b) => a.name.localeCompare(b.name));
}
