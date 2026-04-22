import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const SESSION_ID = "session";

export async function GET() {
  const session = await prisma.shoppingSession.findUnique({
    where: { id: SESSION_ID },
  });
  return NextResponse.json(
    session ?? { id: SESSION_ID, checkedKeys: [], showStaples: false, weekStart: null, weekEnd: null }
  );
}

export async function PUT(request: Request) {
  const body = await request.json();
  const { checkedKeys, showStaples, weekStart, weekEnd } = body as {
    checkedKeys: string[];
    showStaples: boolean;
    weekStart?: string | null;
    weekEnd?: string | null;
  };
  const data: Parameters<typeof prisma.shoppingSession.upsert>[0]["create"] = {
    id: SESSION_ID,
    checkedKeys,
    showStaples,
  };
  if (weekStart !== undefined) data.weekStart = weekStart ? new Date(weekStart) : null;
  if (weekEnd !== undefined) data.weekEnd = weekEnd ? new Date(weekEnd) : null;

  const session = await prisma.shoppingSession.upsert({
    where: { id: SESSION_ID },
    create: data,
    update: data,
  });
  return NextResponse.json(session);
}
