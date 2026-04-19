import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const meals = await prisma.scheduledMeal.findMany({
    where:
      from && to
        ? { date: { gte: new Date(from), lte: new Date(to) } }
        : undefined,
    include: { mealPlanEntry: { include: { recipe: true } } },
    orderBy: [{ date: "asc" }, { mealType: "asc" }],
  });

  return NextResponse.json(meals);
}

export async function POST(req: NextRequest) {
  const { mealPlanEntryId, date, mealType, servings } = await req.json();

  const entry = await prisma.mealPlanEntry.findUnique({
    where: { id: mealPlanEntryId },
    include: { scheduledMeals: true },
  });

  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const alreadyAllocated = entry.scheduledMeals.reduce(
    (sum, s) => sum + s.servings,
    0
  );

  if (alreadyAllocated + servings > entry.targetServings) {
    return NextResponse.json(
      { error: "Exceeds basket total" },
      { status: 400 }
    );
  }

  const dateObj = new Date(date);
  const conflict = await prisma.scheduledMeal.findFirst({
    where: { mealPlanEntryId, date: dateObj, mealType },
  });

  if (conflict) {
    return NextResponse.json(
      { error: "Slot already occupied" },
      { status: 409 }
    );
  }

  const meal = await prisma.scheduledMeal.create({
    data: { mealPlanEntryId, date: dateObj, mealType, servings },
    include: { mealPlanEntry: { include: { recipe: true } } },
  });

  return NextResponse.json(meal, { status: 201 });
}
