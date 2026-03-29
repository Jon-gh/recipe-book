import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    mealPlanEntry: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { GET } from "@/app/api/grocery-list/route";

const entryWithRecipe = {
  id: 1,
  recipeId: "abc123",
  targetServings: 4,
  recipe: {
    servings: 4,
    ingredients: [
      { name: "pasta", quantity: 400, unit: "g" },
      { name: "beef", quantity: 500, unit: "g" },
    ],
  },
};

beforeEach(() => vi.clearAllMocks());

describe("GET /api/grocery-list", () => {
  it("returns empty list for empty meal plan", async () => {
    vi.mocked(prisma.mealPlanEntry.findMany).mockResolvedValue([] as never);
    const res = await GET();
    expect(await res.json()).toEqual([]);
  });

  it("returns aggregated ingredients", async () => {
    vi.mocked(prisma.mealPlanEntry.findMany).mockResolvedValue([entryWithRecipe] as never);
    const res = await GET();
    const body = await res.json();
    expect(body).toHaveLength(2);
    expect(body.map((i: { name: string }) => i.name)).toContain("pasta");
  });

  it("returns ingredients sorted alphabetically", async () => {
    vi.mocked(prisma.mealPlanEntry.findMany).mockResolvedValue([entryWithRecipe] as never);
    const res = await GET();
    const names = (await res.json()).map((i: { name: string }) => i.name);
    expect(names).toEqual([...names].sort());
  });

  it("scales quantities when targetServings differs from recipe servings", async () => {
    const doubled = { ...entryWithRecipe, targetServings: 8 };
    vi.mocked(prisma.mealPlanEntry.findMany).mockResolvedValue([doubled] as never);
    const res = await GET();
    const pasta = (await res.json()).find((i: { name: string }) => i.name === "pasta");
    expect(pasta.quantity).toBe(800);
  });
});
