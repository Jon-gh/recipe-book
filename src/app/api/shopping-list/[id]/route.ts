import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  if (isNaN(id)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
  await prisma.shoppingListItem.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
