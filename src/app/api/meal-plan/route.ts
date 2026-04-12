import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const entries = await prisma.mealPlanEntry.findMany({
    include: { recipe: { include: { ingredients: true } } },
    orderBy: { id: "asc" },
  });

  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const { recipeId, targetServings } = await req.json();

  // If this recipe is already in the plan, sum the servings rather than
  // creating a duplicate entry.
  const existing = await prisma.mealPlanEntry.findFirst({ where: { recipeId } });

  if (existing) {
    const entry = await prisma.mealPlanEntry.update({
      where: { id: existing.id },
      data: { targetServings: existing.targetServings + targetServings },
      include: { recipe: { include: { ingredients: true } } },
    });
    return NextResponse.json(entry);
  }

  const entry = await prisma.mealPlanEntry.create({
    data: { recipeId, targetServings },
    include: { recipe: { include: { ingredients: true } } },
  });

  return NextResponse.json(entry, { status: 201 });
}
