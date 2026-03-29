import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.mealPlanEntry.delete({ where: { id: parseInt(params.id) } });
  return new NextResponse(null, { status: 204 });
}
