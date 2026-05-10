import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const session = await prisma.shoppingSession.findUnique({
    where: { userId },
  });
  return NextResponse.json(
    session ?? { checkedKeys: [], showStaples: false, weekStart: null, weekEnd: null }
  );
}

export async function PUT(request: Request) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const body = await request.json();
  const { checkedKeys, showStaples, weekStart, weekEnd } = body as {
    checkedKeys: string[];
    showStaples: boolean;
    weekStart?: string | null;
    weekEnd?: string | null;
  };

  const data: {
    userId: string;
    checkedKeys: string[];
    showStaples: boolean;
    weekStart?: Date | null;
    weekEnd?: Date | null;
  } = {
    userId,
    checkedKeys,
    showStaples,
  };
  if (weekStart !== undefined) data.weekStart = weekStart ? new Date(weekStart) : null;
  if (weekEnd !== undefined) data.weekEnd = weekEnd ? new Date(weekEnd) : null;

  const session = await prisma.shoppingSession.upsert({
    where: { userId },
    create: data,
    update: data,
  });
  return NextResponse.json(session);
}
