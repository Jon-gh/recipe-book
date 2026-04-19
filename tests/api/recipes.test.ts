import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    recipe: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    ingredient: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { GET, POST } from "@/app/api/recipes/route";
import { GET as GET_ONE, PUT, DELETE } from "@/app/api/recipes/[id]/route";
import { POST as DUPLICATE } from "@/app/api/recipes/[id]/duplicate/route";

const mockIngredient = { id: 1, name: "pasta", category: "grains & pulses" };

const mockRecipe = {
  id: "abc123",
  name: "Spaghetti Bolognese",
  servings: 4,
  instructions: "Cook pasta.",
  tags: ["italian"],
  favourite: false,
  notes: "",
  createdAt: new Date(),
  updatedAt: new Date(),
  ingredients: [
    { id: 1, recipeId: "abc123", ingredientId: 1, quantity: 400, unit: "g", preparation: "", ingredient: mockIngredient },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  // Default: ingredient already exists (find-or-create returns existing)
  vi.mocked(prisma.ingredient.findFirst).mockResolvedValue(mockIngredient as never);
});

// ---------------------------------------------------------------------------
// GET /api/recipes
// ---------------------------------------------------------------------------
describe("GET /api/recipes", () => {
  it("returns list of recipes", async () => {
    vi.mocked(prisma.recipe.findMany).mockResolvedValue([mockRecipe] as never);
    const req = new NextRequest("http://localhost/api/recipes");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].name).toBe("Spaghetti Bolognese");
  });

  it("returns empty list when no recipes", async () => {
    vi.mocked(prisma.recipe.findMany).mockResolvedValue([] as never);
    const req = new NextRequest("http://localhost/api/recipes");
    const res = await GET(req);
    expect(await res.json()).toEqual([]);
  });

  it("passes q filter as OR across name, tags, and ingredients", async () => {
    vi.mocked(prisma.recipe.findMany).mockResolvedValue([] as never);
    const req = new NextRequest("http://localhost/api/recipes?q=pasta");
    await GET(req);
    expect(prisma.recipe.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { name: { contains: "pasta", mode: "insensitive" } },
            { tags: { has: "pasta" } },
            { ingredients: { some: { ingredient: { name: { contains: "pasta", mode: "insensitive" } } } } },
          ],
        }),
      })
    );
  });

  it("passes favourite filter to prisma", async () => {
    vi.mocked(prisma.recipe.findMany).mockResolvedValue([] as never);
    const req = new NextRequest("http://localhost/api/recipes?favourite=true");
    await GET(req);
    expect(prisma.recipe.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ favourite: true }) })
    );
  });

  it("omits OR clause when q is not provided", async () => {
    vi.mocked(prisma.recipe.findMany).mockResolvedValue([] as never);
    const req = new NextRequest("http://localhost/api/recipes");
    await GET(req);
    expect(prisma.recipe.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.not.objectContaining({ OR: expect.anything() }) })
    );
  });
});

// ---------------------------------------------------------------------------
// POST /api/recipes
// ---------------------------------------------------------------------------
describe("POST /api/recipes", () => {
  it("creates a recipe and returns 201", async () => {
    vi.mocked(prisma.recipe.create).mockResolvedValue(mockRecipe as never);
    const req = new NextRequest("http://localhost/api/recipes", {
      method: "POST",
      body: JSON.stringify({ name: "Spaghetti", servings: 4, instructions: "Cook.", ingredients: [] }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBe("Spaghetti Bolognese");
  });
});

// ---------------------------------------------------------------------------
// GET /api/recipes/[id]
// ---------------------------------------------------------------------------
describe("GET /api/recipes/[id]", () => {
  it("returns a recipe by id", async () => {
    vi.mocked(prisma.recipe.findUnique).mockResolvedValue(mockRecipe as never);
    const req = new NextRequest("http://localhost/api/recipes/abc123");
    const res = await GET_ONE(req, { params: { id: "abc123" } });
    expect(res.status).toBe(200);
    expect((await res.json()).id).toBe("abc123");
  });

  it("returns 404 for unknown id", async () => {
    vi.mocked(prisma.recipe.findUnique).mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/recipes/unknown");
    const res = await GET_ONE(req, { params: { id: "unknown" } });
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// PUT /api/recipes/[id]
// ---------------------------------------------------------------------------
describe("PUT /api/recipes/[id]", () => {
  it("updates and returns recipe", async () => {
    const updated = { ...mockRecipe, name: "Updated Name" };
    vi.mocked(prisma.recipe.update).mockResolvedValue(updated as never);
    const req = new NextRequest("http://localhost/api/recipes/abc123", {
      method: "PUT",
      body: JSON.stringify({ name: "Updated Name" }),
    });
    const res = await PUT(req, { params: { id: "abc123" } });
    expect(res.status).toBe(200);
    expect((await res.json()).name).toBe("Updated Name");
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/recipes/[id]
// ---------------------------------------------------------------------------
describe("DELETE /api/recipes/[id]", () => {
  it("deletes recipe and returns 204", async () => {
    vi.mocked(prisma.recipe.delete).mockResolvedValue(mockRecipe as never);
    const req = new NextRequest("http://localhost/api/recipes/abc123", { method: "DELETE" });
    const res = await DELETE(req, { params: { id: "abc123" } });
    expect(res.status).toBe(204);
  });
});

// ---------------------------------------------------------------------------
// POST /api/recipes/[id]/duplicate
// ---------------------------------------------------------------------------
describe("POST /api/recipes/[id]/duplicate", () => {
  it("returns 404 when original not found", async () => {
    vi.mocked(prisma.recipe.findUnique).mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/recipes/unknown/duplicate", { method: "POST" });
    const res = await DUPLICATE(req, { params: { id: "unknown" } });
    expect(res.status).toBe(404);
  });

  it("creates duplicate with (copy) suffix", async () => {
    vi.mocked(prisma.recipe.findUnique).mockResolvedValue(mockRecipe as never);
    const duplicate = { ...mockRecipe, id: "copy123", name: "Spaghetti Bolognese (copy)" };
    vi.mocked(prisma.recipe.create).mockResolvedValue(duplicate as never);
    const req = new NextRequest("http://localhost/api/recipes/abc123/duplicate", { method: "POST" });
    const res = await DUPLICATE(req, { params: { id: "abc123" } });
    expect(res.status).toBe(201);
    expect((await res.json()).name).toBe("Spaghetti Bolognese (copy)");
  });

  it("duplicate has a different id from original", async () => {
    vi.mocked(prisma.recipe.findUnique).mockResolvedValue(mockRecipe as never);
    const duplicate = { ...mockRecipe, id: "copy123", name: "Spaghetti Bolognese (copy)" };
    vi.mocked(prisma.recipe.create).mockResolvedValue(duplicate as never);
    const req = new NextRequest("http://localhost/api/recipes/abc123/duplicate", { method: "POST" });
    const res = await DUPLICATE(req, { params: { id: "abc123" } });
    expect((await res.json()).id).not.toBe("abc123");
  });
});
