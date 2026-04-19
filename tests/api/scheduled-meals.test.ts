import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    scheduledMeal: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    mealPlanEntry: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { GET, POST } from "@/app/api/scheduled-meals/route";
import { PATCH, DELETE } from "@/app/api/scheduled-meals/[id]/route";

const mockRecipe = { id: "r1", name: "Spag. Bol.", servings: 4 };
const mockEntry = {
  id: 1,
  targetServings: 8,
  recipeId: "r1",
  recipe: mockRecipe,
  scheduledMeals: [],
};
const mockMeal = {
  id: 10,
  date: "2026-04-21T00:00:00.000Z",
  mealType: "dinner",
  servings: 4,
  mealPlanEntryId: 1,
  mealPlanEntry: { ...mockEntry, recipe: mockRecipe },
};

beforeEach(() => vi.clearAllMocks());

describe("GET /api/scheduled-meals", () => {
  it("returns all scheduled meals", async () => {
    vi.mocked(prisma.scheduledMeal.findMany).mockResolvedValue([mockMeal] as never);
    const req = new NextRequest("http://localhost/api/scheduled-meals");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
  });

  it("passes date range filter when from/to provided", async () => {
    vi.mocked(prisma.scheduledMeal.findMany).mockResolvedValue([] as never);
    const req = new NextRequest(
      "http://localhost/api/scheduled-meals?from=2026-04-21&to=2026-04-27"
    );
    await GET(req);
    expect(prisma.scheduledMeal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ date: expect.any(Object) }),
      })
    );
  });
});

describe("POST /api/scheduled-meals", () => {
  it("creates a slot when budget allows", async () => {
    vi.mocked(prisma.mealPlanEntry.findUnique).mockResolvedValue(mockEntry as never);
    vi.mocked(prisma.scheduledMeal.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.scheduledMeal.create).mockResolvedValue(mockMeal as never);

    const req = new NextRequest("http://localhost/api/scheduled-meals", {
      method: "POST",
      body: JSON.stringify({
        mealPlanEntryId: 1,
        date: "2026-04-21",
        mealType: "dinner",
        servings: 4,
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
  });

  it("returns 400 when servings would exceed basket total", async () => {
    const fullEntry = {
      ...mockEntry,
      targetServings: 4,
      scheduledMeals: [{ id: 11, servings: 4 }],
    };
    vi.mocked(prisma.mealPlanEntry.findUnique).mockResolvedValue(fullEntry as never);

    const req = new NextRequest("http://localhost/api/scheduled-meals", {
      method: "POST",
      body: JSON.stringify({
        mealPlanEntryId: 1,
        date: "2026-04-22",
        mealType: "lunch",
        servings: 2,
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Exceeds basket total");
  });

  it("returns 409 when slot already occupied", async () => {
    vi.mocked(prisma.mealPlanEntry.findUnique).mockResolvedValue(mockEntry as never);
    vi.mocked(prisma.scheduledMeal.findFirst).mockResolvedValue(mockMeal as never);

    const req = new NextRequest("http://localhost/api/scheduled-meals", {
      method: "POST",
      body: JSON.stringify({
        mealPlanEntryId: 1,
        date: "2026-04-21",
        mealType: "dinner",
        servings: 2,
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(409);
  });

  it("returns 404 when meal plan entry not found", async () => {
    vi.mocked(prisma.mealPlanEntry.findUnique).mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/scheduled-meals", {
      method: "POST",
      body: JSON.stringify({
        mealPlanEntryId: 99,
        date: "2026-04-21",
        mealType: "dinner",
        servings: 2,
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/scheduled-meals/[id]", () => {
  it("updates servings when budget allows", async () => {
    const current = {
      ...mockMeal,
      servings: 2,
      mealPlanEntry: { ...mockEntry, scheduledMeals: [{ id: 10, servings: 2 }] },
    };
    vi.mocked(prisma.scheduledMeal.findUnique).mockResolvedValue(current as never);
    vi.mocked(prisma.scheduledMeal.update).mockResolvedValue({ ...mockMeal, servings: 4 } as never);

    const req = new NextRequest("http://localhost/api/scheduled-meals/10", {
      method: "PATCH",
      body: JSON.stringify({ servings: 4 }),
    });
    const res = await PATCH(req, { params: { id: "10" } });
    expect(res.status).toBe(200);
  });

  it("returns 400 when update would exceed basket total", async () => {
    const current = {
      ...mockMeal,
      servings: 2,
      mealPlanEntry: {
        ...mockEntry,
        targetServings: 6,
        scheduledMeals: [
          { id: 10, servings: 2 },
          { id: 11, servings: 4 },
        ],
      },
    };
    vi.mocked(prisma.scheduledMeal.findUnique).mockResolvedValue(current as never);

    const req = new NextRequest("http://localhost/api/scheduled-meals/10", {
      method: "PATCH",
      body: JSON.stringify({ servings: 4 }),
    });
    const res = await PATCH(req, { params: { id: "10" } });
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/scheduled-meals/[id]", () => {
  it("deletes and returns 204", async () => {
    vi.mocked(prisma.scheduledMeal.delete).mockResolvedValue(mockMeal as never);
    const req = new NextRequest("http://localhost/api/scheduled-meals/10", {
      method: "DELETE",
    });
    const res = await DELETE(req, { params: { id: "10" } });
    expect(res.status).toBe(204);
  });
});
