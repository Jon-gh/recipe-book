import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    product: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    recipeIngredient: { updateMany: vi.fn() },
    shoppingListItem: { updateMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import { prisma } from "@/lib/prisma";
import { GET } from "@/app/api/products/route";
import { PUT } from "@/app/api/products/[id]/route";
import { NextRequest } from "next/server";

const userProduct = { id: 1, name: "tomatoe", category: "fruit & veg", defaultUnit: "", defaultQuantity: 1, source: "user" };
const systemProduct = { id: 2, name: "tomato", category: "fruit & veg", defaultUnit: "", defaultQuantity: 1, source: "system" };

beforeEach(() => vi.clearAllMocks());

describe("GET /api/products", () => {
  it("returns all products when no filters", async () => {
    vi.mocked(prisma.product.findMany).mockResolvedValue([userProduct, systemProduct] as never);
    const req = new NextRequest("http://localhost/api/products");
    const res = await GET(req);
    expect(await res.json()).toEqual([userProduct, systemProduct]);
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10 })
    );
  });

  it("filters by source=user and removes take limit", async () => {
    vi.mocked(prisma.product.findMany).mockResolvedValue([userProduct] as never);
    const req = new NextRequest("http://localhost/api/products?source=user");
    const res = await GET(req);
    expect(await res.json()).toEqual([userProduct]);
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { source: "user" }, take: undefined })
    );
  });
});

describe("PUT /api/products/[id]", () => {
  it("returns 400 for non-numeric id", async () => {
    const req = new NextRequest("http://localhost/api/products/abc", { method: "PUT", body: JSON.stringify({}) });
    const res = await PUT(req, { params: { id: "abc" } });
    expect(res.status).toBe(400);
  });

  it("returns 404 when product not found", async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/products/99", { method: "PUT", body: JSON.stringify({ name: "tomato" }) });
    const res = await PUT(req, { params: { id: "99" } });
    expect(res.status).toBe(404);
  });

  it("returns 403 for system products", async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValue(systemProduct as never);
    const req = new NextRequest("http://localhost/api/products/2", { method: "PUT", body: JSON.stringify({ name: "tomato" }) });
    const res = await PUT(req, { params: { id: "2" } });
    expect(res.status).toBe(403);
  });

  it("renames a user product", async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValue(userProduct as never);
    vi.mocked(prisma.product.findFirst).mockResolvedValue(null);
    const updated = { ...userProduct, name: "tomato" };
    vi.mocked(prisma.product.update).mockResolvedValue(updated as never);

    const req = new NextRequest("http://localhost/api/products/1", {
      method: "PUT",
      body: JSON.stringify({ name: "tomato", category: "fruit & veg", defaultUnit: "" }),
    });
    const res = await PUT(req, { params: { id: "1" } });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(updated);
    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { name: "tomato", category: "fruit & veg", defaultUnit: "" },
    });
  });

  it("merges into existing product when rename target already exists", async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValue(userProduct as never);
    vi.mocked(prisma.product.findFirst).mockResolvedValue(systemProduct as never);
    vi.mocked(prisma.$transaction).mockResolvedValue([]);

    const req = new NextRequest("http://localhost/api/products/1", {
      method: "PUT",
      body: JSON.stringify({ name: "tomato" }),
    });
    const res = await PUT(req, { params: { id: "1" } });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(systemProduct);
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.product.update).not.toHaveBeenCalled();
  });

  it("updates category and defaultUnit without renaming", async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValue(userProduct as never);
    const updated = { ...userProduct, category: "dairy & eggs", defaultUnit: "g" };
    vi.mocked(prisma.product.update).mockResolvedValue(updated as never);

    const req = new NextRequest("http://localhost/api/products/1", {
      method: "PUT",
      body: JSON.stringify({ category: "dairy & eggs", defaultUnit: "g" }),
    });
    const res = await PUT(req, { params: { id: "1" } });

    expect(res.status).toBe(200);
    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { category: "dairy & eggs", defaultUnit: "g" },
    });
  });
});
