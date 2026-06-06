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
    session ?? { needsStapleReview: false, weekStart: null, weekEnd: null }
  );
}

export async function PUT(request: Request) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const body = await request.json();
  const { needsStapleReview, weekStart, weekEnd } = body as {
    needsStapleReview?: boolean;
    weekStart?: string | null;
    weekEnd?: string | null;
  };

  const data: {
    userId: string;
    needsStapleReview?: boolean;
    weekStart?: Date | null;
    weekEnd?: Date | null;
  } = { userId };

  if (needsStapleReview !== undefined) data.needsStapleReview = needsStapleReview;
  if (weekStart !== undefined) data.weekStart = weekStart ? new Date(weekStart) : null;
  if (weekEnd !== undefined) data.weekEnd = weekEnd ? new Date(weekEnd) : null;

  const session = await prisma.shoppingSession.upsert({
    where: { userId },
    create: data,
    update: data,
  });
  return NextResponse.json(session);
}
