import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const SESSION_ID = "session";

export async function GET() {
  const session = await prisma.shoppingSession.findUnique({
    where: { id: SESSION_ID },
  });
  return NextResponse.json(
    session ?? { id: SESSION_ID, checkedKeys: [], showStaples: false }
  );
}

export async function PUT(request: Request) {
  const body = await request.json();
  const { checkedKeys, showStaples } = body as {
    checkedKeys: string[];
    showStaples: boolean;
  };
  const session = await prisma.shoppingSession.upsert({
    where: { id: SESSION_ID },
    create: { id: SESSION_ID, checkedKeys, showStaples },
    update: { checkedKeys, showStaples },
  });
  return NextResponse.json(session);
}
