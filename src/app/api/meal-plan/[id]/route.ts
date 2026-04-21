import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { targetServings } = await req.json();
  const entry = await prisma.mealPlanEntry.update({
    where: { id: parseInt(params.id) },
    data: { targetServings },
    include: { recipe: { include: { ingredients: { include: { product: true } } } }, scheduledMeals: true },
  });
  return NextResponse.json(entry);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.mealPlanEntry.delete({ where: { id: parseInt(params.id) } });
  return new NextResponse(null, { status: 204 });
}
