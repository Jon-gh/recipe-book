import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({ requireUserId: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GET, PATCH } from "@/app/api/user/locale/route";
import { NextResponse } from "next/server";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireUserId).mockResolvedValue({ userId: "user-1" });
});

describe("GET /api/user/locale", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireUserId).mockResolvedValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    );
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns the user locale", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ locale: "fr" } as never);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ locale: "fr" });
  });

  it("sets NEXT_LOCALE cookie in response", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ locale: "es" } as never);
    const res = await GET();
    const cookieHeader = res.headers.get("set-cookie");
    expect(cookieHeader).toContain("NEXT_LOCALE=es");
  });

  it("falls back to en when user has no locale set", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null as never);
    const res = await GET();
    expect(await res.json()).toEqual({ locale: "en" });
  });
});

describe("PATCH /api/user/locale", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireUserId).mockResolvedValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    );
    const req = new Request("http://localhost/api/user/locale", {
      method: "PATCH",
      body: JSON.stringify({ locale: "fr" }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(401);
  });

  it("updates user locale and returns it", async () => {
    vi.mocked(prisma.user.update).mockResolvedValue({ locale: "fr" } as never);
    const req = new Request("http://localhost/api/user/locale", {
      method: "PATCH",
      body: JSON.stringify({ locale: "fr" }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ locale: "fr" });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { locale: "fr" },
    });
  });

  it("sets NEXT_LOCALE cookie in response", async () => {
    vi.mocked(prisma.user.update).mockResolvedValue({ locale: "zh-CN" } as never);
    const req = new Request("http://localhost/api/user/locale", {
      method: "PATCH",
      body: JSON.stringify({ locale: "zh-CN" }),
    });
    const res = await PATCH(req);
    const cookieHeader = res.headers.get("set-cookie");
    expect(cookieHeader).toContain("NEXT_LOCALE=zh-CN");
  });

  it("returns 400 for unsupported locale", async () => {
    const req = new Request("http://localhost/api/user/locale", {
      method: "PATCH",
      body: JSON.stringify({ locale: "de" }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when locale is missing", async () => {
    const req = new Request("http://localhost/api/user/locale", {
      method: "PATCH",
      body: JSON.stringify({}),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });
});
