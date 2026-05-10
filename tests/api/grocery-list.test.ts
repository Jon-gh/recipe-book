import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    mealPlanEntry: {
      findMany: vi.fn(),
    },
  },
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { GET } from "@/app/api/grocery-list/route";

const mockGetServerSession = vi.mocked(getServerSession);

const entryWithRecipe = {
  id: 1,
  recipeId: "abc123",
  targetServings: 4,
  userId: "user-1",
  recipe: {
    servings: 4,
    ingredients: [
      { product: { name: "pasta", category: "grains & pulses" }, quantity: 400, unit: "g" },
      { product: { name: "beef", category: "meat & fish" }, quantity: 500, unit: "g" },
    ],
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetServerSession.mockResolvedValue({
    user: { id: "user-1", email: "test@example.com", name: "Test" },
    expires: "2099-01-01",
  } as never);
});

describe("GET /api/grocery-list", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("scopes query to userId", async () => {
    vi.mocked(prisma.mealPlanEntry.findMany).mockResolvedValue([] as never);
    await GET();
    expect(prisma.mealPlanEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: "user-1" }) })
    );
  });

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
