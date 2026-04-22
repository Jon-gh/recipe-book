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
    expect(body.showStaples).toBe(false);
  });

  it("returns default state when no session exists", async () => {
    vi.mocked(prisma.shoppingSession.findUnique).mockResolvedValue(null);
    const res = await GET();
    const body = await res.json();
    expect(body).toEqual({ id: "session", checkedKeys: [], showStaples: false, weekStart: null, weekEnd: null });
  });
});

describe("PUT /api/shopping-session", () => {
  it("upserts the session and returns it", async () => {
    vi.mocked(prisma.shoppingSession.upsert).mockResolvedValue(mockSession as never);
    const req = new NextRequest("http://localhost/api/shopping-session", {
      method: "PUT",
      body: JSON.stringify({ checkedKeys: ["milk__l"], showStaples: false }),
    });
    const res = await PUT(req);
    expect(res.status).toBe(200);
    expect(prisma.shoppingSession.upsert).toHaveBeenCalled();
  });

  it("persists weekStart and weekEnd when provided", async () => {
    vi.mocked(prisma.shoppingSession.upsert).mockResolvedValue(mockSession as never);
    const req = new NextRequest("http://localhost/api/shopping-session", {
      method: "PUT",
      body: JSON.stringify({
        checkedKeys: [],
        showStaples: false,
        weekStart: "2026-04-28",
        weekEnd: "2026-05-04",
      }),
    });
    const res = await PUT(req);
    expect(res.status).toBe(200);
    const call = vi.mocked(prisma.shoppingSession.upsert).mock.calls[0][0];
    expect(call.create.weekStart).toBeInstanceOf(Date);
    expect(call.create.weekEnd).toBeInstanceOf(Date);
  });
});
