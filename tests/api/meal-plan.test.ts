import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    mealPlanEntry: {
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { GET, POST } from "@/app/api/meal-plan/route";
import { DELETE } from "@/app/api/meal-plan/[id]/route";

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
  it("creates entry and returns 201", async () => {
    vi.mocked(prisma.mealPlanEntry.create).mockResolvedValue(mockEntry as never);
    const req = new NextRequest("http://localhost/api/meal-plan", {
      method: "POST",
      body: JSON.stringify({ recipeId: "abc123", targetServings: 4 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    expect((await res.json()).recipeId).toBe("abc123");
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
