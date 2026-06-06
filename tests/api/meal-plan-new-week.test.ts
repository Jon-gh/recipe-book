import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/auth", () => ({ requireUserId: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    mealPlanEntry: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    scheduledMeal: { deleteMany: vi.fn(), create: vi.fn() },
    shoppingSession: { upsert: vi.fn() },
  },
}));

import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { POST } from "@/app/api/meal-plan/new-week/route";


const makeEntry = (id: number, targetServings: number) => ({
  id,
  targetServings,
  recipeId: `recipe-${id}`,
  userId: "user-1",
  recipe: {
    id: `recipe-${id}`,
    name: `Recipe ${id}`,
    servings: 4,
    instructions: "",
    tags: [],
    favourite: false,
    notes: "",
    ingredients: [],
  },
  scheduledMeals: [],
});

// Shared transaction stub — populated in beforeEach
const mockTx = {
  mealPlanEntry: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  scheduledMeal: { deleteMany: vi.fn(), create: vi.fn() },
  shoppingSession: { upsert: vi.fn() },
  recipe: { findUnique: vi.fn() },
  shoppingListItem: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  product: { findUnique: vi.fn() },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireUserId).mockResolvedValue({ userId: "user-1" });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (prisma.$transaction as any).mockImplementation(async (fn: (tx: unknown) => unknown) => fn(mockTx));

  // Default tx stubs
  mockTx.mealPlanEntry.findMany.mockResolvedValue([]);
  mockTx.mealPlanEntry.findFirst.mockResolvedValue(null);
  mockTx.mealPlanEntry.create.mockImplementation(({ data }: { data: { recipeId: string; targetServings: number } }) =>
    Promise.resolve(makeEntry(parseInt(data.recipeId.split("-")[1] || "0"), data.targetServings))
  );
  mockTx.mealPlanEntry.update.mockResolvedValue(makeEntry(1, 4));
  mockTx.mealPlanEntry.delete.mockResolvedValue({});
  mockTx.scheduledMeal.deleteMany.mockResolvedValue({ count: 0 });
  mockTx.scheduledMeal.create.mockResolvedValue({});
  mockTx.shoppingSession.upsert.mockResolvedValue({});
  mockTx.recipe.findUnique.mockResolvedValue(null);
  mockTx.shoppingListItem.findFirst.mockResolvedValue(null);
  mockTx.shoppingListItem.create.mockResolvedValue({});
  mockTx.product.findUnique.mockResolvedValue({ name: "pasta" });
});

function makeReq(body: object) {
  return new NextRequest("http://localhost/api/meal-plan/new-week", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/meal-plan/new-week", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireUserId).mockResolvedValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    );
    const res = await POST(makeReq({ consumed: [], weekStart: "2026-04-28", weekEnd: "2026-05-04" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when weekStart is missing", async () => {
    const res = await POST(makeReq({ consumed: [], weekEnd: "2026-05-04" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when weekEnd is missing", async () => {
    const res = await POST(makeReq({ consumed: [], weekStart: "2026-04-28" }));
    expect(res.status).toBe(400);
  });

  it("deletes fully consumed entries", async () => {
    const entry = makeEntry(1, 4);
    mockTx.mealPlanEntry.findMany
      .mockResolvedValueOnce([entry])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    mockTx.mealPlanEntry.delete.mockResolvedValue(entry);

    const res = await POST(
      makeReq({
        consumed: [{ id: 1, consumedServings: 4 }],
        weekStart: "2026-04-28",
        weekEnd: "2026-05-04",
        newEntries: [],
      })
    );
    expect(res.status).toBe(200);
    expect(mockTx.mealPlanEntry.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it("reduces targetServings for partially consumed entries and clears their scheduled meals", async () => {
    const entry = makeEntry(1, 4);
    mockTx.mealPlanEntry.findMany
      .mockResolvedValueOnce([entry])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ ...entry, targetServings: 2 }]);
    mockTx.mealPlanEntry.update.mockResolvedValue({ ...entry, targetServings: 2 });

    const res = await POST(
      makeReq({
        consumed: [{ id: 1, consumedServings: 2 }],
        weekStart: "2026-04-28",
        weekEnd: "2026-05-04",
        newEntries: [],
      })
    );
    expect(res.status).toBe(200);
    expect(mockTx.mealPlanEntry.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { targetServings: 2 },
    });
    expect(mockTx.scheduledMeal.deleteMany).toHaveBeenCalledWith({
      where: { mealPlanEntryId: 1 },
    });
  });

  it("upserts session with new week dates using userId", async () => {
    await POST(
      makeReq({
        consumed: [],
        weekStart: "2026-04-28",
        weekEnd: "2026-05-04",
        newEntries: [],
      })
    );

    expect(mockTx.shoppingSession.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1" },
        update: expect.objectContaining({
          weekStart: new Date("2026-04-28"),
          weekEnd: new Date("2026-05-04"),
        }),
      })
    );
  });

  it("creates new entries with userId when recipe not present", async () => {
    mockTx.mealPlanEntry.create.mockResolvedValue(makeEntry(2, 4));

    await POST(
      makeReq({
        consumed: [],
        weekStart: "2026-04-28",
        weekEnd: "2026-05-04",
        newEntries: [{ recipeId: "recipe-2", targetServings: 4 }],
      })
    );

    expect(mockTx.mealPlanEntry.create).toHaveBeenCalledWith({
      data: { recipeId: "recipe-2", targetServings: 4, userId: "user-1" },
    });
  });

  it("creates scheduled meals for existing entry slots with userId", async () => {
    const entry = makeEntry(1, 4);
    mockTx.mealPlanEntry.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([entry]);

    await POST(
      makeReq({
        consumed: [],
        weekStart: "2026-04-28",
        weekEnd: "2026-05-04",
        newEntries: [],
        slots: [{ date: "2026-04-28", mealType: "lunch", servings: 2, existingEntryId: 1 }],
      })
    );

    expect(mockTx.scheduledMeal.create).toHaveBeenCalledWith({
      data: {
        mealPlanEntryId: 1,
        date: new Date("2026-04-28T00:00:00"),
        mealType: "lunch",
        servings: 2,
        userId: "user-1",
      },
    });
  });

  it("creates scheduled meals for new entry slots using recipeId map with userId", async () => {
    const newEntry = makeEntry(5, 4);
    mockTx.mealPlanEntry.create.mockResolvedValue(newEntry);

    await POST(
      makeReq({
        consumed: [],
        weekStart: "2026-04-28",
        weekEnd: "2026-05-04",
        newEntries: [{ recipeId: "recipe-5", targetServings: 4 }],
        slots: [{ date: "2026-04-29", mealType: "dinner", servings: 2, newRecipeId: "recipe-5" }],
      })
    );

    expect(mockTx.scheduledMeal.create).toHaveBeenCalledWith({
      data: {
        mealPlanEntryId: 5,
        date: new Date("2026-04-29T00:00:00"),
        mealType: "dinner",
        servings: 2,
        userId: "user-1",
      },
    });
  });

  it("increments targetServings when new entry recipe already exists", async () => {
    const existing = makeEntry(2, 2);
    mockTx.mealPlanEntry.findFirst.mockResolvedValue(existing);
    mockTx.mealPlanEntry.update.mockResolvedValue({ ...existing, targetServings: 6 });

    await POST(
      makeReq({
        consumed: [],
        weekStart: "2026-04-28",
        weekEnd: "2026-05-04",
        newEntries: [{ recipeId: "recipe-2", targetServings: 4 }],
      })
    );

    expect(mockTx.mealPlanEntry.update).toHaveBeenCalledWith({
      where: { id: 2 },
      data: { targetServings: 6 },
    });
  });

  it("creates a custom note slot with userId when slot has a note field", async () => {
    await POST(
      makeReq({
        consumed: [],
        weekStart: "2026-04-28",
        weekEnd: "2026-05-04",
        newEntries: [],
        slots: [{ date: "2026-04-28", mealType: "dinner", servings: 1, note: "Eating outside" }],
      })
    );

    expect(mockTx.scheduledMeal.create).toHaveBeenCalledWith({
      data: {
        date: new Date("2026-04-28T00:00:00"),
        mealType: "dinner",
        servings: 1,
        note: "Eating outside",
        userId: "user-1",
      },
    });
  });

  it("applies grocery delta for new entries (not for consumed portions)", async () => {
    const recipe = {
      id: "recipe-3",
      servings: 2,
      ingredients: [
        { productId: 10, quantity: 100, unit: "g", product: { id: 10, category: "grains & pulses", name: "rice" } },
      ],
    };
    mockTx.mealPlanEntry.create.mockResolvedValue(makeEntry(3, 4));
    mockTx.recipe.findUnique.mockResolvedValue(recipe);
    mockTx.product.findUnique.mockResolvedValue({ name: "rice" });

    await POST(
      makeReq({
        consumed: [],
        weekStart: "2026-04-28",
        weekEnd: "2026-05-04",
        newEntries: [{ recipeId: "recipe-3", targetServings: 4 }],
      })
    );

    // Delta: 4/2 × 100g = 200g rice
    expect(mockTx.shoppingListItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ productId: 10, quantity: 200, unit: "g" }),
      })
    );
  });
});
