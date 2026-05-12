import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const id = parseInt(params.id);
  const owned = await prisma.mealPlanEntry.findFirst({ where: { id, userId } });
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { targetServings } = await req.json();
  const entry = await prisma.mealPlanEntry.update({
    where: { id },
    data: { targetServings },
    include: {
      recipe: { include: { ingredients: { include: { product: true } } } },
      scheduledMeals: true,
    },
  });
  return NextResponse.json(entry);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const id = parseInt(params.id);
  const owned = await prisma.mealPlanEntry.findFirst({ where: { id, userId } });
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.mealPlanEntry.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
