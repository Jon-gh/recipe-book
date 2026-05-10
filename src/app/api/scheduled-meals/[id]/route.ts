import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const id = parseInt(params.id);
  const { servings } = await req.json();

  const current = await prisma.scheduledMeal.findFirst({
    where: { id, userId },
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
    return NextResponse.json({ error: "Exceeds basket total" }, { status: 400 });
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
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const id = parseInt(params.id);
  const owned = await prisma.scheduledMeal.findFirst({ where: { id, userId } });
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.scheduledMeal.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
