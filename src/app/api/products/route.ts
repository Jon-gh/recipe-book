import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q");

  const products = await prisma.product.findMany({
    where: q ? { name: { contains: q, mode: "insensitive" } } : undefined,
    orderBy: { name: "asc" },
  });

  return NextResponse.json(products);
}
