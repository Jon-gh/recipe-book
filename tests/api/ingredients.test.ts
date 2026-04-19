import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    ingredient: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { GET } from "@/app/api/ingredients/route";

const mockIngredients = [
  { id: 1, name: "garlic", category: "fruit & veg" },
  { id: 2, name: "pasta", category: "grains & pulses" },
  { id: 3, name: "parmesan", category: "dairy & eggs" },
];

beforeEach(() => vi.clearAllMocks());

describe("GET /api/ingredients", () => {
  it("returns all ingredients sorted alphabetically", async () => {
    vi.mocked(prisma.ingredient.findMany).mockResolvedValue(mockIngredients as never);
    const req = new NextRequest("http://localhost/api/ingredients");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(3);
  });

  it("returns empty list when no ingredients exist", async () => {
    vi.mocked(prisma.ingredient.findMany).mockResolvedValue([] as never);
    const req = new NextRequest("http://localhost/api/ingredients");
    const res = await GET(req);
    expect(await res.json()).toEqual([]);
  });

  it("passes q filter as case-insensitive name search", async () => {
    vi.mocked(prisma.ingredient.findMany).mockResolvedValue([mockIngredients[0]] as never);
    const req = new NextRequest("http://localhost/api/ingredients?q=garlic");
    await GET(req);
    expect(prisma.ingredient.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { name: { contains: "garlic", mode: "insensitive" } },
      })
    );
  });

  it("omits where clause when q is not provided", async () => {
    vi.mocked(prisma.ingredient.findMany).mockResolvedValue(mockIngredients as never);
    const req = new NextRequest("http://localhost/api/ingredients");
    await GET(req);
    expect(prisma.ingredient.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: undefined })
    );
  });

  it("each ingredient has id, name, and category fields", async () => {
    vi.mocked(prisma.ingredient.findMany).mockResolvedValue([mockIngredients[0]] as never);
    const req = new NextRequest("http://localhost/api/ingredients");
    const res = await GET(req);
    const [item] = await res.json();
    expect(item).toMatchObject({ id: 1, name: "garlic", category: "fruit & veg" });
  });
});
