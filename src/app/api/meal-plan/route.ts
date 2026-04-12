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

  const entry = await prisma.mealPlanEntry.create({
    data: { recipeId, targetServings },
    include: { recipe: { include: { ingredients: true } } },
  });

  return NextResponse.json(entry, { status: 201 });
}
