import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { consumed, weekStart, weekEnd, newEntries } = (await req.json()) as {
    consumed: { id: number; consumedServings: number }[];
    weekStart: string;
    weekEnd: string;
    newEntries: { recipeId: string; targetServings: number }[];
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
    for (const { recipeId, targetServings } of newEntries ?? []) {
      const existing = await tx.mealPlanEntry.findFirst({ where: { recipeId } });
      if (existing) {
        await tx.mealPlanEntry.update({
          where: { id: existing.id },
          data: { targetServings: existing.targetServings + targetServings },
        });
      } else {
        await tx.mealPlanEntry.create({ data: { recipeId, targetServings } });
      }
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
