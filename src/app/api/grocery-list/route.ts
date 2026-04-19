import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { aggregateGroceryList } from "@/lib/grocery-list";

export const dynamic = "force-dynamic";

export async function GET() {
  const entries = await prisma.mealPlanEntry.findMany({
    include: { recipe: { include: { ingredients: { include: { ingredient: true } } } } },
  });

  return NextResponse.json(aggregateGroceryList(entries));
}
