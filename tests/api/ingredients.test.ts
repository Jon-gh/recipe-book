import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    product: {
      findMany: vi.fn(),
    },
  },
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { GET } from "@/app/api/products/route";

const mockGetServerSession = vi.mocked(getServerSession);

const mockProducts = [
  { id: 1, name: "garlic", category: "fruit & veg", defaultUnit: "", defaultQuantity: 1, source: "system", userId: null },
  { id: 2, name: "pasta", category: "grains & pulses", defaultUnit: "g", defaultQuantity: 500, source: "system", userId: null },
  { id: 3, name: "parmesan", category: "dairy & eggs", defaultUnit: "g", defaultQuantity: 100, source: "system", userId: null },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockGetServerSession.mockResolvedValue({
    user: { id: "user-1", email: "test@example.com", name: "Test" },
    expires: "2099-01-01",
  } as never);
});

describe("GET /api/products", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/products");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns all products sorted alphabetically", async () => {
    vi.mocked(prisma.product.findMany).mockResolvedValue(mockProducts as never);
    const req = new NextRequest("http://localhost/api/products");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(3);
  });

  it("returns empty list when no products exist", async () => {
    vi.mocked(prisma.product.findMany).mockResolvedValue([] as never);
    const req = new NextRequest("http://localhost/api/products");
    const res = await GET(req);
    expect(await res.json()).toEqual([]);
  });

  it("includes OR clause for system and user products", async () => {
    vi.mocked(prisma.product.findMany).mockResolvedValue(mockProducts as never);
    const req = new NextRequest("http://localhost/api/products");
    await GET(req);
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [{ userId: null }, { userId: "user-1" }],
        }),
      })
    );
  });

  it("passes q filter as case-insensitive name search", async () => {
    vi.mocked(prisma.product.findMany).mockResolvedValue([mockProducts[0]] as never);
    const req = new NextRequest("http://localhost/api/products?q=garlic");
    await GET(req);
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          name: { contains: "garlic", mode: "insensitive" },
        }),
      })
    );
  });

  it("limits results to 10", async () => {
    vi.mocked(prisma.product.findMany).mockResolvedValue(mockProducts as never);
    const req = new NextRequest("http://localhost/api/products");
    await GET(req);
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10 })
    );
  });

  it("each product has id, name, category, defaultUnit, and defaultQuantity fields", async () => {
    vi.mocked(prisma.product.findMany).mockResolvedValue([mockProducts[0]] as never);
    const req = new NextRequest("http://localhost/api/products");
    const res = await GET(req);
    const [item] = await res.json();
    expect(item).toMatchObject({ id: 1, name: "garlic", category: "fruit & veg", defaultUnit: "", defaultQuantity: 1 });
  });
});
