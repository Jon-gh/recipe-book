import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const { searchParams } = req.nextUrl;
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const meals = await prisma.scheduledMeal.findMany({
    where: {
      userId,
      ...(from && to ? { date: { gte: new Date(from), lte: new Date(to) } } : {}),
    },
    include: { mealPlanEntry: { include: { recipe: true } } },
    orderBy: [{ date: "asc" }, { mealType: "asc" }],
  });

  return NextResponse.json(meals);
}

export async function POST(req: NextRequest) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const { mealPlanEntryId, date, mealType, servings, note } = await req.json();

  if (note) {
    const meal = await prisma.scheduledMeal.create({
      data: {
        date: new Date(date),
        mealType,
        servings: servings ?? 1,
        note,
        userId,
      },
      include: { mealPlanEntry: { include: { recipe: true } } },
    });
    return NextResponse.json(meal, { status: 201 });
  }

  const entry = await prisma.mealPlanEntry.findFirst({
    where: { id: mealPlanEntryId, userId },
    include: { scheduledMeals: true },
  });

  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const alreadyAllocated = entry.scheduledMeals.reduce((sum, s) => sum + s.servings, 0);

  if (alreadyAllocated + servings > entry.targetServings) {
    return NextResponse.json({ error: "Exceeds basket total" }, { status: 400 });
  }

  const dateObj = new Date(date);
  const conflict = await prisma.scheduledMeal.findFirst({
    where: { mealPlanEntryId, date: dateObj, mealType },
  });

  if (conflict) {
    return NextResponse.json({ error: "Slot already occupied" }, { status: 409 });
  }

  const meal = await prisma.scheduledMeal.create({
    data: { mealPlanEntryId, date: dateObj, mealType, servings, userId },
    include: { mealPlanEntry: { include: { recipe: true } } },
  });

  return NextResponse.json(meal, { status: 201 });
}
