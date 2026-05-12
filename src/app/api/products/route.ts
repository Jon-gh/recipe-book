import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q");
  const source = searchParams.get("source");

  // Return system products (userId: null) + this user's personal products
  const products = await prisma.product.findMany({
    where: {
      OR: [{ userId: null }, { userId }],
      ...(q && { name: { contains: q, mode: "insensitive" } }),
      ...(source && { source }),
    },
    orderBy: { name: "asc" },
    take: source ? undefined : 10,
  });

  return NextResponse.json(products);
}
