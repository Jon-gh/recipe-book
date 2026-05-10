import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";

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

  // If this recipe is already in the user's plan, sum the servings instead of creating a duplicate.
  const existing = await prisma.mealPlanEntry.findFirst({ where: { recipeId, userId } });

  if (existing) {
    const entry = await prisma.mealPlanEntry.update({
      where: { id: existing.id },
      data: { targetServings: existing.targetServings + targetServings },
      include: entryInclude,
    });
    return NextResponse.json(entry);
  }

  const entry = await prisma.mealPlanEntry.create({
    data: { recipeId, targetServings, userId },
    include: entryInclude,
  });

  return NextResponse.json(entry, { status: 201 });
}
