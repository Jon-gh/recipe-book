import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id);
  const { servings } = await req.json();

  const current = await prisma.scheduledMeal.findUnique({
    where: { id },
    include: {
      mealPlanEntry: { include: { scheduledMeals: true } },
    },
  });

  if (!current) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!current.mealPlanEntry) {
    return NextResponse.json({ error: "Cannot update servings on a custom note slot" }, { status: 400 });
  }

  const otherAllocated = current.mealPlanEntry.scheduledMeals
    .filter((s) => s.id !== id)
    .reduce((sum, s) => sum + s.servings, 0);

  if (otherAllocated + servings > current.mealPlanEntry.targetServings) {
    return NextResponse.json(
      { error: "Exceeds basket total" },
      { status: 400 }
    );
  }

  const updated = await prisma.scheduledMeal.update({
    where: { id },
    data: { servings },
    include: { mealPlanEntry: { include: { recipe: true } } },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  await prisma.scheduledMeal.delete({ where: { id: parseInt(params.id) } });
  return new NextResponse(null, { status: 204 });
}
