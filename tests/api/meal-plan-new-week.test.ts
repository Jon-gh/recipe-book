import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    mealPlanEntry: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    scheduledMeal: {
      deleteMany: vi.fn(),
      create: vi.fn(),
    },
    shoppingSession: {
      upsert: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { POST } from "@/app/api/meal-plan/new-week/route";

const makeEntry = (id: number, targetServings: number) => ({
  id,
  targetServings,
  recipeId: `recipe-${id}`,
  recipe: { id: `recipe-${id}`, name: `Recipe ${id}`, servings: 4, instructions: "", tags: [], favourite: false, notes: "", ingredients: [] },
  scheduledMeals: [],
});

beforeEach(() => {
  vi.clearAllMocks();

  // Default $transaction: execute the callback with a tx that mirrors the mocked prisma
  vi.mocked(prisma.$transaction).mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
    return fn(prisma as unknown as typeof prisma);
  });
});

function makeReq(body: object) {
  return new NextRequest("http://localhost/api/meal-plan/new-week", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/meal-plan/new-week", () => {
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
    vi.mocked(prisma.mealPlanEntry.findMany).mockResolvedValue([entry] as never);
    vi.mocked(prisma.mealPlanEntry.delete).mockResolvedValue(entry as never);
    vi.mocked(prisma.scheduledMeal.deleteMany).mockResolvedValue({ count: 0 } as never);
    vi.mocked(prisma.shoppingSession.upsert).mockResolvedValue({} as never);
    // remaining entries after deletion
    vi.mocked(prisma.mealPlanEntry.findMany)
      .mockResolvedValueOnce([entry] as never)
      .mockResolvedValueOnce([] as never);

    const res = await POST(
      makeReq({
        consumed: [{ id: 1, consumedServings: 4 }],
        weekStart: "2026-04-28",
        weekEnd: "2026-05-04",
        newEntries: [],
      })
    );
    expect(res.status).toBe(200);
    expect(prisma.mealPlanEntry.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it("reduces targetServings for partially consumed entries and clears their scheduled meals", async () => {
    const entry = makeEntry(1, 4);
    vi.mocked(prisma.mealPlanEntry.findMany).mockResolvedValue([entry] as never);
    vi.mocked(prisma.mealPlanEntry.update).mockResolvedValue({ ...entry, targetServings: 2 } as never);
    vi.mocked(prisma.scheduledMeal.deleteMany).mockResolvedValue({ count: 2 } as never);
    vi.mocked(prisma.shoppingSession.upsert).mockResolvedValue({} as never);
    vi.mocked(prisma.mealPlanEntry.findMany)
      .mockResolvedValueOnce([entry] as never)
      .mockResolvedValueOnce([{ ...entry, targetServings: 2 }] as never);

    const res = await POST(
      makeReq({
        consumed: [{ id: 1, consumedServings: 2 }],
        weekStart: "2026-04-28",
        weekEnd: "2026-05-04",
        newEntries: [],
      })
    );
    expect(res.status).toBe(200);
    expect(prisma.mealPlanEntry.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { targetServings: 2 },
    });
    expect(prisma.scheduledMeal.deleteMany).toHaveBeenCalledWith({
      where: { mealPlanEntryId: 1 },
    });
  });

  it("upserts session with new week dates", async () => {
    vi.mocked(prisma.mealPlanEntry.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.scheduledMeal.deleteMany).mockResolvedValue({ count: 0 } as never);
    vi.mocked(prisma.shoppingSession.upsert).mockResolvedValue({} as never);

    await POST(
      makeReq({
        consumed: [],
        weekStart: "2026-04-28",
        weekEnd: "2026-05-04",
        newEntries: [],
      })
    );

    expect(prisma.shoppingSession.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "session" },
        update: expect.objectContaining({
          weekStart: new Date("2026-04-28"),
          weekEnd: new Date("2026-05-04"),
        }),
      })
    );
  });

  it("creates new entries without deduplication when recipe not present", async () => {
    vi.mocked(prisma.mealPlanEntry.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.scheduledMeal.deleteMany).mockResolvedValue({ count: 0 } as never);
    vi.mocked(prisma.shoppingSession.upsert).mockResolvedValue({} as never);
    vi.mocked(prisma.mealPlanEntry.findFirst).mockResolvedValue(null as never);
    vi.mocked(prisma.mealPlanEntry.create).mockResolvedValue(makeEntry(2, 4) as never);

    await POST(
      makeReq({
        consumed: [],
        weekStart: "2026-04-28",
        weekEnd: "2026-05-04",
        newEntries: [{ recipeId: "recipe-2", targetServings: 4 }],
      })
    );

    expect(prisma.mealPlanEntry.create).toHaveBeenCalledWith({
      data: { recipeId: "recipe-2", targetServings: 4 },
    });
  });

  it("creates scheduled meals for existing entry slots", async () => {
    const entry = makeEntry(1, 4);
    vi.mocked(prisma.mealPlanEntry.findMany).mockResolvedValue([entry] as never);
    vi.mocked(prisma.scheduledMeal.deleteMany).mockResolvedValue({ count: 0 } as never);
    vi.mocked(prisma.scheduledMeal.create).mockResolvedValue({} as never);
    vi.mocked(prisma.shoppingSession.upsert).mockResolvedValue({} as never);

    await POST(
      makeReq({
        consumed: [],
        weekStart: "2026-04-28",
        weekEnd: "2026-05-04",
        newEntries: [],
        slots: [{ date: "2026-04-28", mealType: "lunch", servings: 2, existingEntryId: 1 }],
      })
    );

    expect(prisma.scheduledMeal.create).toHaveBeenCalledWith({
      data: {
        mealPlanEntryId: 1,
        date: new Date("2026-04-28T00:00:00"),
        mealType: "lunch",
        servings: 2,
      },
    });
  });

  it("creates scheduled meals for new entry slots using recipeId map", async () => {
    vi.mocked(prisma.mealPlanEntry.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.scheduledMeal.deleteMany).mockResolvedValue({ count: 0 } as never);
    vi.mocked(prisma.scheduledMeal.create).mockResolvedValue({} as never);
    vi.mocked(prisma.shoppingSession.upsert).mockResolvedValue({} as never);
    vi.mocked(prisma.mealPlanEntry.findFirst).mockResolvedValue(null as never);
    vi.mocked(prisma.mealPlanEntry.create).mockResolvedValue(makeEntry(5, 4) as never);

    await POST(
      makeReq({
        consumed: [],
        weekStart: "2026-04-28",
        weekEnd: "2026-05-04",
        newEntries: [{ recipeId: "recipe-5", targetServings: 4 }],
        slots: [{ date: "2026-04-29", mealType: "dinner", servings: 2, newRecipeId: "recipe-5" }],
      })
    );

    expect(prisma.scheduledMeal.create).toHaveBeenCalledWith({
      data: {
        mealPlanEntryId: 5,
        date: new Date("2026-04-29T00:00:00"),
        mealType: "dinner",
        servings: 2,
      },
    });
  });

  it("increments targetServings when new entry recipe already exists", async () => {
    const existing = makeEntry(2, 2);
    vi.mocked(prisma.mealPlanEntry.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.scheduledMeal.deleteMany).mockResolvedValue({ count: 0 } as never);
    vi.mocked(prisma.shoppingSession.upsert).mockResolvedValue({} as never);
    vi.mocked(prisma.mealPlanEntry.findFirst).mockResolvedValue(existing as never);
    vi.mocked(prisma.mealPlanEntry.update).mockResolvedValue({ ...existing, targetServings: 6 } as never);

    await POST(
      makeReq({
        consumed: [],
        weekStart: "2026-04-28",
        weekEnd: "2026-05-04",
        newEntries: [{ recipeId: "recipe-2", targetServings: 4 }],
      })
    );

    expect(prisma.mealPlanEntry.update).toHaveBeenCalledWith({
      where: { id: 2 },
      data: { targetServings: 6 },
    });
  });
});
