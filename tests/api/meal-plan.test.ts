import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    mealPlanEntry: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { GET, POST } from "@/app/api/meal-plan/route";
import { PATCH, DELETE } from "@/app/api/meal-plan/[id]/route";

const mockEntry = {
  id: 1,
  recipeId: "abc123",
  targetServings: 4,
  recipe: {
    id: "abc123",
    name: "Spaghetti",
    servings: 4,
    instructions: "Cook.",
    tags: [],
    favourite: false,
    notes: "",
    createdAt: new Date(),
    updatedAt: new Date(),
    ingredients: [],
  },
};

beforeEach(() => vi.clearAllMocks());

describe("GET /api/meal-plan", () => {
  it("returns list of meal plan entries", async () => {
    vi.mocked(prisma.mealPlanEntry.findMany).mockResolvedValue([mockEntry] as never);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].recipeId).toBe("abc123");
  });

  it("returns empty list when meal plan is empty", async () => {
    vi.mocked(prisma.mealPlanEntry.findMany).mockResolvedValue([] as never);
    const res = await GET();
    expect(await res.json()).toEqual([]);
  });
});

describe("POST /api/meal-plan", () => {
  it("creates a new entry and returns 201 when recipe is not yet in the plan", async () => {
    vi.mocked(prisma.mealPlanEntry.findFirst).mockResolvedValue(null as never);
    vi.mocked(prisma.mealPlanEntry.create).mockResolvedValue(mockEntry as never);
    const req = new NextRequest("http://localhost/api/meal-plan", {
      method: "POST",
      body: JSON.stringify({ recipeId: "abc123", targetServings: 4 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    expect((await res.json()).recipeId).toBe("abc123");
    expect(prisma.mealPlanEntry.create).toHaveBeenCalledOnce();
  });

  it("sums servings when recipe already exists in the plan and returns 200", async () => {
    vi.mocked(prisma.mealPlanEntry.findFirst).mockResolvedValue(mockEntry as never);
    const updated = { ...mockEntry, targetServings: 6 };
    vi.mocked(prisma.mealPlanEntry.update).mockResolvedValue(updated as never);
    const req = new NextRequest("http://localhost/api/meal-plan", {
      method: "POST",
      body: JSON.stringify({ recipeId: "abc123", targetServings: 2 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect((await res.json()).targetServings).toBe(6);
    expect(prisma.mealPlanEntry.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { targetServings: 6 } })
    );
    expect(prisma.mealPlanEntry.create).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/meal-plan/[id]", () => {
  it("updates servings and returns 200", async () => {
    const updated = { ...mockEntry, targetServings: 6 };
    vi.mocked(prisma.mealPlanEntry.update).mockResolvedValue(updated as never);
    const req = new NextRequest("http://localhost/api/meal-plan/1", {
      method: "PATCH",
      body: JSON.stringify({ targetServings: 6 }),
    });
    const res = await PATCH(req, { params: { id: "1" } });
    expect(res.status).toBe(200);
    expect((await res.json()).targetServings).toBe(6);
  });
});

describe("DELETE /api/meal-plan/[id]", () => {
  it("deletes entry and returns 204", async () => {
    vi.mocked(prisma.mealPlanEntry.delete).mockResolvedValue(mockEntry as never);
    const req = new NextRequest("http://localhost/api/meal-plan/1", { method: "DELETE" });
    const res = await DELETE(req, { params: { id: "1" } });
    expect(res.status).toBe(204);
  });
});
