import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { applyGroceryDelta } from "@/lib/grocery-delta";

export const dynamic = "force-dynamic";

const entryInclude = {
  recipe: { include: { ingredients: { include: { product: true } } } },
  scheduledMeals: true,
} as const;

export async function GET() {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const entries = await prisma.mealPlanEntry.findMany({
    where: { userId },
    include: entryInclude,
    orderBy: { id: "asc" },
  });

  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const { recipeId, targetServings } = await req.json();

  const { entry, created } = await prisma.$transaction(async (tx) => {
    const recipe = await tx.recipe.findUnique({
      where: { id: recipeId },
      include: { ingredients: { include: { product: true } } },
    });
    if (!recipe) return { entry: null, created: false };

    const existing = await tx.mealPlanEntry.findFirst({ where: { recipeId, userId } });

    let result;
    let isNew: boolean;
    if (existing) {
      result = await tx.mealPlanEntry.update({
        where: { id: existing.id },
        data: { targetServings: existing.targetServings + targetServings },
        include: entryInclude,
      });
      isNew = false;
    } else {
      result = await tx.mealPlanEntry.create({
        data: { recipeId, targetServings, userId },
        include: entryInclude,
      });
      isNew = true;
    }

    const ingredients = recipe.ingredients.map((i) => ({
      productId: i.productId,
      category: i.product.category,
      quantity: i.quantity,
      unit: i.unit,
    }));
    await applyGroceryDelta(userId, recipe.servings, targetServings, ingredients, tx);

    return { entry: result, created: isNew };
  });

  if (!entry) return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  return NextResponse.json(entry, { status: created ? 201 : 200 });
}
