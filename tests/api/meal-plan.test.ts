import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/auth", () => ({ requireUserId: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(mockTx)),
    mealPlanEntry: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

// Minimal transaction client stub — delta helper uses these
const mockTx = {
  recipe: { findUnique: vi.fn() },
  mealPlanEntry: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  shoppingListItem: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  product: { findUnique: vi.fn() },
  scheduledMeal: { deleteMany: vi.fn() },
};

import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GET, POST } from "@/app/api/meal-plan/route";
import { PATCH, DELETE } from "@/app/api/meal-plan/[id]/route";


const mockIngredient = {
  id: 1,
  productId: 1,
  quantity: 100,
  unit: "g",
  preparation: "",
  recipeId: "abc123",
  product: { id: 1, name: "pasta", category: "grains & pulses", source: "system", defaultUnit: "g", defaultQuantity: 1 },
};

const mockRecipe = {
  id: "abc123",
  name: "Spaghetti",
  servings: 4,
  instructions: "Cook.",
  tags: [],
  favourite: false,
  notes: "",
  createdAt: new Date(),
  updatedAt: new Date(),
  ingredients: [mockIngredient],
};

const mockEntry = {
  id: 1,
  recipeId: "abc123",
  targetServings: 4,
  userId: "user-1",
  recipe: mockRecipe,
  scheduledMeals: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireUserId).mockResolvedValue({ userId: "user-1" });
  // Default tx stubs — delta helper sees no existing rows and pasta is not trivial
  mockTx.recipe.findUnique.mockResolvedValue(mockRecipe);
  mockTx.mealPlanEntry.findFirst.mockResolvedValue(null);
  mockTx.mealPlanEntry.create.mockResolvedValue(mockEntry);
  mockTx.mealPlanEntry.update.mockResolvedValue(mockEntry);
  mockTx.mealPlanEntry.delete.mockResolvedValue(mockEntry);
  mockTx.shoppingListItem.findFirst.mockResolvedValue(null);
  mockTx.shoppingListItem.create.mockResolvedValue({});
  mockTx.shoppingListItem.update.mockResolvedValue({});
  mockTx.shoppingListItem.delete.mockResolvedValue({});
  mockTx.product.findUnique.mockResolvedValue({ name: "pasta" });
  mockTx.scheduledMeal.deleteMany.mockResolvedValue({});
});

describe("GET /api/meal-plan", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireUserId).mockResolvedValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    );
    vi.mocked(prisma.mealPlanEntry.findMany).mockResolvedValue([] as never);
    const res = await GET();
    expect(res.status).toBe(401);
  });

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

  it("scopes query to userId", async () => {
    vi.mocked(prisma.mealPlanEntry.findMany).mockResolvedValue([] as never);
    await GET();
    expect(prisma.mealPlanEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: "user-1" }) })
    );
  });
});

describe("POST /api/meal-plan", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireUserId).mockResolvedValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    );
    const req = new NextRequest("http://localhost/api/meal-plan", {
      method: "POST",
      body: JSON.stringify({ recipeId: "abc123", targetServings: 4 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("creates a new entry inside a transaction when recipe is not yet in the plan", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma.$transaction as any).mockImplementation(async (fn: (tx: unknown) => unknown) => fn(mockTx));
    const req = new NextRequest("http://localhost/api/meal-plan", {
      method: "POST",
      body: JSON.stringify({ recipeId: "abc123", targetServings: 4 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    expect(mockTx.mealPlanEntry.create).toHaveBeenCalledOnce();
  });

  it("applies a grocery delta when adding a new entry", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma.$transaction as any).mockImplementation(async (fn: (tx: unknown) => unknown) => fn(mockTx));
    const req = new NextRequest("http://localhost/api/meal-plan", {
      method: "POST",
      body: JSON.stringify({ recipeId: "abc123", targetServings: 4 }),
    });
    await POST(req);
    expect(mockTx.shoppingListItem.create).toHaveBeenCalled();
  });

  it("sums servings when recipe already exists in the plan", async () => {
    mockTx.mealPlanEntry.findFirst.mockResolvedValue(mockEntry);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma.$transaction as any).mockImplementation(async (fn: (tx: unknown) => unknown) => fn(mockTx));
    const req = new NextRequest("http://localhost/api/meal-plan", {
      method: "POST",
      body: JSON.stringify({ recipeId: "abc123", targetServings: 2 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockTx.mealPlanEntry.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { targetServings: 6 } })
    );
  });
});

describe("PATCH /api/meal-plan/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireUserId).mockResolvedValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    );
    vi.mocked(prisma.mealPlanEntry.findFirst).mockResolvedValue(null as never);
    const req = new NextRequest("http://localhost/api/meal-plan/1", {
      method: "PATCH",
      body: JSON.stringify({ targetServings: 6 }),
    });
    const res = await PATCH(req, { params: { id: "1" } });
    expect(res.status).toBe(401);
  });

  it("returns 404 when entry belongs to another user", async () => {
    vi.mocked(prisma.mealPlanEntry.findFirst).mockResolvedValue(null as never);
    const req = new NextRequest("http://localhost/api/meal-plan/1", {
      method: "PATCH",
      body: JSON.stringify({ targetServings: 6 }),
    });
    const res = await PATCH(req, { params: { id: "1" } });
    expect(res.status).toBe(404);
  });

  it("updates servings and applies grocery delta", async () => {
    vi.mocked(prisma.mealPlanEntry.findFirst).mockResolvedValue(mockEntry as never);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma.$transaction as any).mockImplementation(async (fn: (tx: unknown) => unknown) => fn(mockTx));
    const updatedEntry = { ...mockEntry, targetServings: 6 };
    mockTx.mealPlanEntry.update.mockResolvedValue(updatedEntry);
    const req = new NextRequest("http://localhost/api/meal-plan/1", {
      method: "PATCH",
      body: JSON.stringify({ targetServings: 6 }),
    });
    const res = await PATCH(req, { params: { id: "1" } });
    expect(res.status).toBe(200);
    expect((await res.json()).targetServings).toBe(6);
    // Delta applied for +2 servings
    expect(mockTx.shoppingListItem.create).toHaveBeenCalled();
  });
});

describe("DELETE /api/meal-plan/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireUserId).mockResolvedValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    );
    vi.mocked(prisma.mealPlanEntry.findFirst).mockResolvedValue(null as never);
    const req = new NextRequest("http://localhost/api/meal-plan/1", { method: "DELETE" });
    const res = await DELETE(req, { params: { id: "1" } });
    expect(res.status).toBe(401);
  });

  it("returns 404 when entry belongs to another user", async () => {
    vi.mocked(prisma.mealPlanEntry.findFirst).mockResolvedValue(null as never);
    const req = new NextRequest("http://localhost/api/meal-plan/1", { method: "DELETE" });
    const res = await DELETE(req, { params: { id: "1" } });
    expect(res.status).toBe(404);
  });

  it("deletes entry and applies grocery delta subtraction", async () => {
    vi.mocked(prisma.mealPlanEntry.findFirst).mockResolvedValue(mockEntry as never);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma.$transaction as any).mockImplementation(async (fn: (tx: unknown) => unknown) => fn(mockTx));
    mockTx.shoppingListItem.findFirst.mockResolvedValue({ id: 5, quantity: 100, unit: "g" });
    const req = new NextRequest("http://localhost/api/meal-plan/1", { method: "DELETE" });
    const res = await DELETE(req, { params: { id: "1" } });
    expect(res.status).toBe(204);
    expect(mockTx.mealPlanEntry.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });
});
