import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { aggregateGroceryList } from "@/lib/grocery-list";
import { requireUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const entries = await prisma.mealPlanEntry.findMany({
    where: { userId },
    include: { recipe: { include: { ingredients: { include: { product: true } } } } },
  });

  return NextResponse.json(aggregateGroceryList(entries));
}
