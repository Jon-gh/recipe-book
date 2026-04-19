import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const items = await prisma.shoppingListItem.findMany({
    include: { product: true },
    orderBy: { id: "asc" },
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const { name, quantity = 1, unit = "", category = "other" } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  // Find-or-create product (case-insensitive, same as recipe save)
  let product = await prisma.product.findFirst({
    where: { name: { equals: name.trim(), mode: "insensitive" } },
  });
  if (!product) {
    product = await prisma.product.create({
      data: { name: name.trim(), category },
    });
  }

  const item = await prisma.shoppingListItem.create({
    data: { productId: product.id, quantity, unit },
    include: { product: true },
  });

  return NextResponse.json(item, { status: 201 });
}
