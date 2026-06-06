import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { applyGroceryDelta } from "@/lib/grocery-delta";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const id = parseInt(params.id);
  const owned = await prisma.mealPlanEntry.findFirst({
    where: { id, userId },
    include: { recipe: { include: { ingredients: { include: { product: true } } } } },
  });
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { targetServings: newServings } = await req.json();
  const servingsDiff = newServings - owned.targetServings;

  const entry = await prisma.$transaction(async (tx) => {
    const result = await tx.mealPlanEntry.update({
      where: { id },
      data: { targetServings: newServings },
      include: {
        recipe: { include: { ingredients: { include: { product: true } } } },
        scheduledMeals: true,
      },
    });

    if (servingsDiff !== 0) {
      const ingredients = owned.recipe.ingredients.map((i) => ({
        productId: i.productId,
        category: i.product.category,
        quantity: i.quantity,
        unit: i.unit,
      }));
      await applyGroceryDelta(
        userId,
        owned.recipe.servings,
        Math.abs(servingsDiff),
        ingredients,
        tx,
        servingsDiff > 0 ? 1 : -1
      );
    }

    return result;
  });

  return NextResponse.json(entry);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const id = parseInt(params.id);
  const owned = await prisma.mealPlanEntry.findFirst({
    where: { id, userId },
    include: { recipe: { include: { ingredients: { include: { product: true } } } } },
  });
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    const ingredients = owned.recipe.ingredients.map((i) => ({
      productId: i.productId,
      category: i.product.category,
      quantity: i.quantity,
      unit: i.unit,
    }));
    await applyGroceryDelta(userId, owned.recipe.servings, owned.targetServings, ingredients, tx, -1);
    await tx.mealPlanEntry.delete({ where: { id } });
  });

  return new NextResponse(null, { status: 204 });
}
