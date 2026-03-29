import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type GroceryItem = { name: string; quantity: number; unit: string };

export async function GET() {
  const entries = await prisma.mealPlanEntry.findMany({
    include: { recipe: { include: { ingredients: true } } },
  });

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

  const items = Array.from(aggregated.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return NextResponse.json(items);
}
