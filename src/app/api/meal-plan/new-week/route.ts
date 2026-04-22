import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { consumed, weekStart, weekEnd, newEntries, slots } = (await req.json()) as {
    consumed: { id: number; consumedServings: number }[];
    weekStart: string;
    weekEnd: string;
    newEntries: { recipeId: string; targetServings: number }[];
    slots?: { date: string; mealType: string; servings: number; existingEntryId?: number; newRecipeId?: string }[];
  };

  if (!weekStart || !weekEnd) {
    return NextResponse.json({ error: "weekStart and weekEnd are required" }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    // Fetch current entries for the ones being updated
    const entryIds = consumed.map((c) => c.id);
    const entries = entryIds.length
      ? await tx.mealPlanEntry.findMany({ where: { id: { in: entryIds } } })
      : [];

    for (const { id, consumedServings } of consumed) {
      const entry = entries.find((e) => e.id === id);
      if (!entry) continue;

      if (consumedServings >= entry.targetServings) {
        // Fully consumed — delete (cascades ScheduledMeals)
        await tx.mealPlanEntry.delete({ where: { id } });
      } else {
        // Partially consumed — reduce targetServings and clear old schedule
        await tx.scheduledMeal.deleteMany({ where: { mealPlanEntryId: id } });
        await tx.mealPlanEntry.update({
          where: { id },
          data: { targetServings: entry.targetServings - consumedServings },
        });
      }
    }

    // Clear ScheduledMeals for any entries not in the consumed list
    const notConsumedIds = await tx.mealPlanEntry.findMany({
      where: { id: { notIn: entryIds } },
      select: { id: true },
    });
    if (notConsumedIds.length) {
      await tx.scheduledMeal.deleteMany({
        where: { mealPlanEntryId: { in: notConsumedIds.map((e) => e.id) } },
      });
    }

    // Add new entries (dedup: if recipe already exists, increment targetServings)
    // Track recipeId → entryId so slots can resolve new entries to DB IDs
    const newEntryMap: Record<string, number> = {};
    for (const { recipeId, targetServings } of newEntries ?? []) {
      const existing = await tx.mealPlanEntry.findFirst({ where: { recipeId } });
      if (existing) {
        await tx.mealPlanEntry.update({
          where: { id: existing.id },
          data: { targetServings: existing.targetServings + targetServings },
        });
        newEntryMap[recipeId] = existing.id;
      } else {
        const created = await tx.mealPlanEntry.create({ data: { recipeId, targetServings } });
        newEntryMap[recipeId] = created.id;
      }
    }

    // Create scheduled meals from wizard slots
    for (const slot of slots ?? []) {
      const entryId =
        slot.existingEntryId ?? (slot.newRecipeId ? newEntryMap[slot.newRecipeId] : undefined);
      if (!entryId) continue;
      await tx.scheduledMeal.create({
        data: {
          mealPlanEntryId: entryId,
          date: new Date(slot.date + "T00:00:00"),
          mealType: slot.mealType,
          servings: slot.servings,
        },
      });
    }

    // Persist new week dates
    const session = await tx.shoppingSession.upsert({
      where: { id: "session" },
      create: {
        id: "session",
        weekStart: new Date(weekStart),
        weekEnd: new Date(weekEnd),
      },
      update: {
        weekStart: new Date(weekStart),
        weekEnd: new Date(weekEnd),
      },
    });

    const remainingEntries = await tx.mealPlanEntry.findMany({
      include: {
        recipe: { include: { ingredients: { include: { product: true } } } },
        scheduledMeals: true,
      },
    });

    return { session, entries: remainingEntries };
  });

  return NextResponse.json(result, { status: 200 });
}
