import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    shoppingSession: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { GET, PUT } from "@/app/api/shopping-session/route";
import { NextRequest } from "next/server";

const mockSession = {
  id: "session",
  checkedKeys: ["milk__l", "eggs__"],
  shoppingMode: true,
  showStaples: false,
  updatedAt: new Date(),
};

beforeEach(() => vi.clearAllMocks());

describe("GET /api/shopping-session", () => {
  it("returns the stored session", async () => {
    vi.mocked(prisma.shoppingSession.findUnique).mockResolvedValue(mockSession as never);
    const res = await GET();
    const body = await res.json();
    expect(body.checkedKeys).toEqual(["milk__l", "eggs__"]);
    expect(body.shoppingMode).toBe(true);
  });

  it("returns default state when no session exists", async () => {
    vi.mocked(prisma.shoppingSession.findUnique).mockResolvedValue(null);
    const res = await GET();
    const body = await res.json();
    expect(body).toEqual({ id: "session", checkedKeys: [], shoppingMode: false, showStaples: false });
  });
});

describe("PUT /api/shopping-session", () => {
  it("upserts the session and returns it", async () => {
    vi.mocked(prisma.shoppingSession.upsert).mockResolvedValue(mockSession as never);
    const req = new NextRequest("http://localhost/api/shopping-session", {
      method: "PUT",
      body: JSON.stringify({ checkedKeys: ["milk__l"], shoppingMode: true, showStaples: false }),
    });
    const res = await PUT(req);
    expect(res.status).toBe(200);
    expect(prisma.shoppingSession.upsert).toHaveBeenCalledWith({
      where: { id: "session" },
      create: { id: "session", checkedKeys: ["milk__l"], shoppingMode: true, showStaples: false },
      update: { checkedKeys: ["milk__l"], shoppingMode: true, showStaples: false },
    });
  });
});
