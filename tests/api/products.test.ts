import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({ requireUserId: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    product: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    recipeIngredient: { updateMany: vi.fn(), deleteMany: vi.fn() },
    shoppingListItem: { updateMany: vi.fn(), deleteMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));


import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GET } from "@/app/api/products/route";
import { PUT, DELETE } from "@/app/api/products/[id]/route";
import { NextRequest, NextResponse } from "next/server";


const userProduct = { id: 1, name: "tomatoe", category: "fruit & veg", defaultUnit: "", defaultQuantity: 1, source: "user", userId: "user-1" };
const systemProduct = { id: 2, name: "tomato", category: "fruit & veg", defaultUnit: "", defaultQuantity: 1, source: "system", userId: null };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireUserId).mockResolvedValue({ userId: "user-1" });
});

describe("GET /api/products", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireUserId).mockResolvedValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    );
    const req = new NextRequest("http://localhost/api/products");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns system and user products (strips translations array)", async () => {
    vi.mocked(prisma.product.findMany).mockResolvedValue([
      { ...userProduct, translations: [] },
      { ...systemProduct, translations: [] },
    ] as never);
    const req = new NextRequest("http://localhost/api/products");
    const body = await (await GET(req)).json();
    // displayName is undefined when no translation; rest of fields preserved
    expect(body[0].name).toBe(userProduct.name);
    expect(body[0].translations).toBeUndefined();
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10 })
    );
  });

  it("filters by source=user and removes take limit", async () => {
    vi.mocked(prisma.product.findMany).mockResolvedValue([{ ...userProduct, translations: [] }] as never);
    const req = new NextRequest("http://localhost/api/products?source=user");
    await GET(req);
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ source: "user" }),
        take: undefined,
      })
    );
  });

  it("searches ProductTranslation names for non-English locale", async () => {
    vi.mocked(prisma.product.findMany).mockResolvedValue([
      { ...systemProduct, translations: [{ name: "tomate" }] },
    ] as never);
    const req = new NextRequest("http://localhost/api/products?q=tomate", {
      headers: { "x-user-locale": "fr" },
    });
    await GET(req);
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ name: expect.objectContaining({ contains: "tomate" }) }),
            expect.objectContaining({ translations: expect.anything() }),
          ]),
        }),
      })
    );
  });

  it("exposes displayName from translation when available", async () => {
    vi.mocked(prisma.product.findMany).mockResolvedValue([
      { ...systemProduct, translations: [{ name: "tomate" }] },
    ] as never);
    const req = new NextRequest("http://localhost/api/products?q=tomate", {
      headers: { "x-user-locale": "fr" },
    });
    const body = await (await GET(req)).json();
    expect(body[0].displayName).toBe("tomate");
  });
});

describe("DELETE /api/products/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireUserId).mockResolvedValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    );
    const req = new NextRequest("http://localhost/api/products/1", { method: "DELETE" });
    const res = await DELETE(req, { params: { id: "1" } });
    expect(res.status).toBe(401);
  });

  it("returns 400 for non-numeric id", async () => {
    const req = new NextRequest("http://localhost/api/products/abc", { method: "DELETE" });
    const res = await DELETE(req, { params: { id: "abc" } });
    expect(res.status).toBe(400);
  });

  it("returns 404 when product not found", async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/products/99", { method: "DELETE" });
    const res = await DELETE(req, { params: { id: "99" } });
    expect(res.status).toBe(404);
  });

  it("returns 403 for system products", async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValue(systemProduct as never);
    const req = new NextRequest("http://localhost/api/products/2", { method: "DELETE" });
    const res = await DELETE(req, { params: { id: "2" } });
    expect(res.status).toBe(403);
  });

  it("returns 404 when user product belongs to another user", async () => {
    const otherUserProduct = { ...userProduct, userId: "other-user" };
    vi.mocked(prisma.product.findUnique).mockResolvedValue(otherUserProduct as never);
    const req = new NextRequest("http://localhost/api/products/1", { method: "DELETE" });
    const res = await DELETE(req, { params: { id: "1" } });
    expect(res.status).toBe(404);
  });

  it("deletes a user product and its references", async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValue(userProduct as never);
    vi.mocked(prisma.$transaction).mockResolvedValue([]);
    const req = new NextRequest("http://localhost/api/products/1", { method: "DELETE" });
    const res = await DELETE(req, { params: { id: "1" } });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(prisma.$transaction).toHaveBeenCalled();
  });
});

describe("PUT /api/products/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireUserId).mockResolvedValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    );
    const req = new NextRequest("http://localhost/api/products/1", { method: "PUT", body: JSON.stringify({}) });
    const res = await PUT(req, { params: { id: "1" } });
    expect(res.status).toBe(401);
  });

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

  it("returns 404 when user product belongs to another user", async () => {
    const otherUserProduct = { ...userProduct, userId: "other-user" };
    vi.mocked(prisma.product.findUnique).mockResolvedValue(otherUserProduct as never);
    const req = new NextRequest("http://localhost/api/products/1", { method: "PUT", body: JSON.stringify({ name: "tomato" }) });
    const res = await PUT(req, { params: { id: "1" } });
    expect(res.status).toBe(404);
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
