import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id);
  if (isNaN(id)) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (product.source !== "user") {
    return NextResponse.json({ error: "cannot edit system products" }, { status: 403 });
  }

  const { name, category, defaultUnit } = await req.json();
  const trimmedName = name?.trim();

  // Smart rename: if target name already exists as a different product, merge references into it
  if (trimmedName && trimmedName.toLowerCase() !== product.name.toLowerCase()) {
    const conflict = await prisma.product.findFirst({
      where: { name: { equals: trimmedName, mode: "insensitive" } },
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
