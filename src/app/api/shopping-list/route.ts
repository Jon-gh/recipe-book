import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const items = await prisma.shoppingListItem.findMany({
    where: { userId },
    include: { product: true },
    orderBy: { id: "asc" },
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const { name, quantity = 1, unit = "", category = "other" } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  // Find-or-create a user-scoped product (source: "user", userId set)
  let product = await prisma.product.findFirst({
    where: { name: { equals: name.trim(), mode: "insensitive" }, userId },
  });
  if (!product) {
    // Also check if it exists as a system product (userId: null)
    const systemProduct = await prisma.product.findFirst({
      where: { name: { equals: name.trim(), mode: "insensitive" }, userId: null },
    });
    if (systemProduct) {
      product = systemProduct;
    } else {
      product = await prisma.product.create({
        data: { name: name.trim(), category, source: "user", userId },
      });
    }
  }

  const item = await prisma.shoppingListItem.create({
    data: { productId: product.id, quantity, unit, userId },
    include: { product: true },
  });

  return NextResponse.json(item, { status: 201 });
}
