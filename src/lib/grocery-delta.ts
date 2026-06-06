import { normalizeUnit } from "@/lib/grocery-list";
import { categoryIsStaple } from "@/lib/categories";
import { Prisma } from "@/generated/prisma";

// Trivial ingredients that should never appear on a shopping list
const TRIVIAL_NAMES = new Set(["water"]);

type Ingredient = {
  productId: number;
  category: string;
  quantity: number;
  unit: string;
};

/**
 * Applies a scaled quantity delta to ShoppingListItem rows.
 * direction=1 adds (add recipe / servings+), direction=-1 subtracts (remove recipe / servings-).
 * Staple-category ingredients are skipped — they're handled by the check-in flow.
 * Rows that reach <= 0 are deleted; new rows are created when delta > 0.
 */
export async function applyGroceryDelta(
  userId: string,
  recipeServings: number,
  targetServings: number,
  ingredients: Ingredient[],
  tx: Prisma.TransactionClient,
  direction: 1 | -1 = 1
): Promise<void> {
  const factor = (direction * targetServings) / recipeServings;

  for (const ing of ingredients) {
    if (categoryIsStaple(ing.category)) continue;

    const { canonical, factor: unitFactor } = normalizeUnit(ing.unit);
    const delta = Math.round(ing.quantity * factor * unitFactor * 1000) / 1000;
    if (delta === 0) continue;

    const existing = await tx.shoppingListItem.findFirst({
      where: { userId, productId: ing.productId, unit: canonical },
    });

    if (existing) {
      const newQty = Math.round((existing.quantity + delta) * 1000) / 1000;
      if (newQty <= 0) {
        await tx.shoppingListItem.delete({ where: { id: existing.id } });
      } else {
        await tx.shoppingListItem.update({
          where: { id: existing.id },
          data: { quantity: newQty },
        });
      }
    } else if (delta > 0) {
      const product = await tx.product.findUnique({
        where: { id: ing.productId },
        select: { name: true },
      });
      if (!product || TRIVIAL_NAMES.has(product.name.trim().toLowerCase())) continue;

      await tx.shoppingListItem.create({
        data: { userId, productId: ing.productId, quantity: delta, unit: canonical },
      });
    }
  }
}
