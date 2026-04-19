import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    shoppingListItem: {
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    ingredient: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { GET, POST } from "@/app/api/shopping-list/route";
import { DELETE } from "@/app/api/shopping-list/[id]/route";
import { NextRequest } from "next/server";

const mockIngredient = { id: 1, name: "garlic", category: "fruit & veg" };
const mockItem = { id: 10, quantity: 2, unit: "clove", ingredient: mockIngredient };

beforeEach(() => vi.clearAllMocks());

describe("GET /api/shopping-list", () => {
  it("returns all shopping list items", async () => {
    vi.mocked(prisma.shoppingListItem.findMany).mockResolvedValue([mockItem] as never);
    const res = await GET();
    expect(await res.json()).toEqual([mockItem]);
  });

  it("returns empty array when list is empty", async () => {
    vi.mocked(prisma.shoppingListItem.findMany).mockResolvedValue([] as never);
    const res = await GET();
    expect(await res.json()).toEqual([]);
  });
});

describe("POST /api/shopping-list", () => {
  it("reuses an existing ingredient and creates the item", async () => {
    vi.mocked(prisma.ingredient.findFirst).mockResolvedValue(mockIngredient as never);
    vi.mocked(prisma.shoppingListItem.create).mockResolvedValue(mockItem as never);

    const req = new NextRequest("http://localhost/api/shopping-list", {
      method: "POST",
      body: JSON.stringify({ name: "garlic", quantity: 2, unit: "clove" }),
    });
    const res = await POST(req);

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual(mockItem);
    expect(prisma.ingredient.create).not.toHaveBeenCalled();
    expect(prisma.shoppingListItem.create).toHaveBeenCalledWith({
      data: { ingredientId: mockIngredient.id, quantity: 2, unit: "clove" },
      include: { ingredient: true },
    });
  });

  it("creates a new ingredient when none exists", async () => {
    vi.mocked(prisma.ingredient.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.ingredient.create).mockResolvedValue(mockIngredient as never);
    vi.mocked(prisma.shoppingListItem.create).mockResolvedValue(mockItem as never);

    const req = new NextRequest("http://localhost/api/shopping-list", {
      method: "POST",
      body: JSON.stringify({ name: "garlic" }),
    });
    const res = await POST(req);

    expect(res.status).toBe(201);
    expect(prisma.ingredient.create).toHaveBeenCalledWith({
      data: { name: "garlic", category: "other" },
    });
  });

  it("defaults quantity to 1 and unit to empty string", async () => {
    vi.mocked(prisma.ingredient.findFirst).mockResolvedValue(mockIngredient as never);
    vi.mocked(prisma.shoppingListItem.create).mockResolvedValue(mockItem as never);

    const req = new NextRequest("http://localhost/api/shopping-list", {
      method: "POST",
      body: JSON.stringify({ name: "garlic" }),
    });
    await POST(req);

    expect(prisma.shoppingListItem.create).toHaveBeenCalledWith({
      data: { ingredientId: mockIngredient.id, quantity: 1, unit: "" },
      include: { ingredient: true },
    });
  });

  it("returns 400 when name is missing", async () => {
    const req = new NextRequest("http://localhost/api/shopping-list", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/shopping-list/[id]", () => {
  it("deletes the item and returns 204", async () => {
    vi.mocked(prisma.shoppingListItem.delete).mockResolvedValue(mockItem as never);

    const req = new NextRequest("http://localhost/api/shopping-list/10", {
      method: "DELETE",
    });
    const res = await DELETE(req, { params: { id: "10" } });

    expect(res.status).toBe(204);
    expect(prisma.shoppingListItem.delete).toHaveBeenCalledWith({ where: { id: 10 } });
  });

  it("returns 400 for a non-numeric id", async () => {
    const req = new NextRequest("http://localhost/api/shopping-list/abc", {
      method: "DELETE",
    });
    const res = await DELETE(req, { params: { id: "abc" } });
    expect(res.status).toBe(400);
  });
});
