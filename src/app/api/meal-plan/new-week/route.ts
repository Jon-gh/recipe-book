import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const { consumed, weekStart, weekEnd, newEntries, slots } = (await req.json()) as {
    consumed: { id: number; consumedServings: number }[];
    weekStart: string;
    weekEnd: string;
    newEntries: { recipeId: string; targetServings: number }[];
    slots?: { date: string; mealType: string; servings: number; existingEntryId?: number; newRecipeId?: string; note?: string }[];
  };

  if (!weekStart || !weekEnd) {
    return NextResponse.json({ error: "weekStart and weekEnd are required" }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    // Only operate on entries belonging to this user
    const entryIds = consumed.map((c) => c.id);
    const entries = entryIds.length
      ? await tx.mealPlanEntry.findMany({ where: { id: { in: entryIds }, userId } })
      : [];

    for (const { id, consumedServings } of consumed) {
      const entry = entries.find((e) => e.id === id);
      if (!entry) continue;

      if (consumedServings >= entry.targetServings) {
        await tx.mealPlanEntry.delete({ where: { id } });
      } else {
        await tx.scheduledMeal.deleteMany({ where: { mealPlanEntryId: id } });
        await tx.mealPlanEntry.update({
          where: { id },
          data: { targetServings: entry.targetServings - consumedServings },
        });
      }
    }

    // Clear ScheduledMeals for user's entries not in the consumed list
    const notConsumedIds = await tx.mealPlanEntry.findMany({
      where: { id: { notIn: entryIds }, userId },
      select: { id: true },
    });
    if (notConsumedIds.length) {
      await tx.scheduledMeal.deleteMany({
        where: { mealPlanEntryId: { in: notConsumedIds.map((e) => e.id) } },
      });
    }

    // Add new entries (dedup within user's plan)
    const newEntryMap: Record<string, number> = {};
    for (const { recipeId, targetServings } of newEntries ?? []) {
      const existing = await tx.mealPlanEntry.findFirst({ where: { recipeId, userId } });
      if (existing) {
        await tx.mealPlanEntry.update({
          where: { id: existing.id },
          data: { targetServings: existing.targetServings + targetServings },
        });
        newEntryMap[recipeId] = existing.id;
      } else {
        const created = await tx.mealPlanEntry.create({ data: { recipeId, targetServings, userId } });
        newEntryMap[recipeId] = created.id;
      }
    }

    // Create scheduled meals from wizard slots
    for (const slot of slots ?? []) {
      if (slot.note) {
        await tx.scheduledMeal.create({
          data: {
            date: new Date(slot.date + "T00:00:00"),
            mealType: slot.mealType,
            servings: slot.servings,
            note: slot.note,
            userId,
          },
        });
        continue;
      }
      const entryId =
        slot.existingEntryId ?? (slot.newRecipeId ? newEntryMap[slot.newRecipeId] : undefined);
      if (!entryId) continue;
      await tx.scheduledMeal.create({
        data: {
          mealPlanEntryId: entryId,
          date: new Date(slot.date + "T00:00:00"),
          mealType: slot.mealType,
          servings: slot.servings,
          userId,
        },
      });
    }

    // Persist new week dates for this user
    const session = await tx.shoppingSession.upsert({
      where: { userId },
      create: {
        userId,
        weekStart: new Date(weekStart),
        weekEnd: new Date(weekEnd),
      },
      update: {
        weekStart: new Date(weekStart),
        weekEnd: new Date(weekEnd),
      },
    });

    const remainingEntries = await tx.mealPlanEntry.findMany({
      where: { userId },
      include: {
        recipe: { include: { ingredients: { include: { product: true } } } },
        scheduledMeals: true,
      },
    });

    return { session, entries: remainingEntries };
  });

  return NextResponse.json(result, { status: 200 });
}
