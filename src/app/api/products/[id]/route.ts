import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const id = parseInt(params.id);
  if (isNaN(id)) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (product.source !== "user") {
    return NextResponse.json({ error: "cannot delete system products" }, { status: 403 });
  }
  if (product.userId !== userId) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.shoppingListItem.deleteMany({ where: { productId: id } }),
    prisma.recipeIngredient.deleteMany({ where: { productId: id } }),
    prisma.product.delete({ where: { id } }),
  ]);

  return NextResponse.json({ ok: true });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const id = parseInt(params.id);
  if (isNaN(id)) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (product.source !== "user") {
    return NextResponse.json({ error: "cannot edit system products" }, { status: 403 });
  }
  if (product.userId !== userId) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const { name, category, defaultUnit } = await req.json();
  const trimmedName = name?.trim();

  // Smart rename: if target name already exists as the user's product, merge into it
  if (trimmedName && trimmedName.toLowerCase() !== product.name.toLowerCase()) {
    const conflict = await prisma.product.findFirst({
      where: {
        name: { equals: trimmedName, mode: "insensitive" },
        userId,
      },
    });

    if (conflict && conflict.id !== id) {
      await prisma.$transaction([
        prisma.recipeIngredient.updateMany({ where: { productId: id }, data: { productId: conflict.id } }),
        prisma.shoppingListItem.updateMany({ where: { productId: id }, data: { productId: conflict.id } }),
        prisma.product.delete({ where: { id } }),
      ]);
      return NextResponse.json(conflict);
    }
  }

  const updated = await prisma.product.update({
    where: { id },
    data: {
      ...(trimmedName && { name: trimmedName }),
      ...(category !== undefined && { category }),
      ...(defaultUnit !== undefined && { defaultUnit }),
    },
  });

  return NextResponse.json(updated);
}
