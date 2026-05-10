import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    shoppingListItem: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    product: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { GET, POST } from "@/app/api/shopping-list/route";
import { DELETE } from "@/app/api/shopping-list/[id]/route";
import { NextRequest } from "next/server";

const mockGetServerSession = vi.mocked(getServerSession);

const mockProduct = { id: 1, name: "garlic", category: "fruit & veg", defaultUnit: "", defaultQuantity: 1, userId: "user-1", source: "user" };
const mockItem = { id: 10, quantity: 2, unit: "clove", userId: "user-1", product: mockProduct };

beforeEach(() => {
  vi.clearAllMocks();
  mockGetServerSession.mockResolvedValue({
    user: { id: "user-1", email: "test@example.com", name: "Test" },
    expires: "2099-01-01",
  } as never);
});

describe("GET /api/shopping-list", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns all shopping list items scoped to user", async () => {
    vi.mocked(prisma.shoppingListItem.findMany).mockResolvedValue([mockItem] as never);
    const res = await GET();
    expect(await res.json()).toEqual([mockItem]);
    expect(prisma.shoppingListItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: "user-1" }) })
    );
  });

  it("returns empty array when list is empty", async () => {
    vi.mocked(prisma.shoppingListItem.findMany).mockResolvedValue([] as never);
    const res = await GET();
    expect(await res.json()).toEqual([]);
  });
});

describe("POST /api/shopping-list", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/shopping-list", {
      method: "POST",
      body: JSON.stringify({ name: "garlic" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("reuses an existing user ingredient and creates the item", async () => {
    // first findFirst (user product) returns the product
    vi.mocked(prisma.product.findFirst).mockResolvedValueOnce(mockProduct as never);
    vi.mocked(prisma.shoppingListItem.create).mockResolvedValue(mockItem as never);

    const req = new NextRequest("http://localhost/api/shopping-list", {
      method: "POST",
      body: JSON.stringify({ name: "garlic", quantity: 2, unit: "clove" }),
    });
    const res = await POST(req);

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual(mockItem);
    expect(prisma.product.create).not.toHaveBeenCalled();
    expect(prisma.shoppingListItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ productId: mockProduct.id, userId: "user-1" }),
      })
    );
  });

  it("falls back to system product if no user product found", async () => {
    const systemProduct = { ...mockProduct, userId: null, source: "system" };
    // first findFirst (user product) returns null, second (system product) returns the product
    vi.mocked(prisma.product.findFirst)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(systemProduct as never);
    vi.mocked(prisma.shoppingListItem.create).mockResolvedValue(mockItem as never);

    const req = new NextRequest("http://localhost/api/shopping-list", {
      method: "POST",
      body: JSON.stringify({ name: "garlic" }),
    });
    await POST(req);

    expect(prisma.product.create).not.toHaveBeenCalled();
    expect(prisma.shoppingListItem.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ productId: systemProduct.id }) })
    );
  });

  it("creates a new user-scoped ingredient when none exists", async () => {
    vi.mocked(prisma.product.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.product.create).mockResolvedValue(mockProduct as never);
    vi.mocked(prisma.shoppingListItem.create).mockResolvedValue(mockItem as never);

    const req = new NextRequest("http://localhost/api/shopping-list", {
      method: "POST",
      body: JSON.stringify({ name: "garlic" }),
    });
    const res = await POST(req);

    expect(res.status).toBe(201);
    expect(prisma.product.create).toHaveBeenCalledWith({
      data: { name: "garlic", category: "other", source: "user", userId: "user-1" },
    });
  });

  it("creates a new ingredient with the provided category", async () => {
    vi.mocked(prisma.product.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.product.create).mockResolvedValue(mockProduct as never);
    vi.mocked(prisma.shoppingListItem.create).mockResolvedValue(mockItem as never);

    const req = new NextRequest("http://localhost/api/shopping-list", {
      method: "POST",
      body: JSON.stringify({ name: "garlic", category: "fruit & veg" }),
    });
    await POST(req);

    expect(prisma.product.create).toHaveBeenCalledWith({
      data: { name: "garlic", category: "fruit & veg", source: "user", userId: "user-1" },
    });
  });

  it("defaults quantity to 1 and unit to empty string", async () => {
    vi.mocked(prisma.product.findFirst).mockResolvedValueOnce(mockProduct as never);
    vi.mocked(prisma.shoppingListItem.create).mockResolvedValue(mockItem as never);

    const req = new NextRequest("http://localhost/api/shopping-list", {
      method: "POST",
      body: JSON.stringify({ name: "garlic" }),
    });
    await POST(req);

    expect(prisma.shoppingListItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ productId: mockProduct.id, quantity: 1, unit: "" }),
      })
    );
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
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/shopping-list/10", { method: "DELETE" });
    const res = await DELETE(req, { params: { id: "10" } });
    expect(res.status).toBe(401);
  });

  it("returns 404 when item belongs to another user", async () => {
    vi.mocked(prisma.shoppingListItem.findFirst).mockResolvedValue(null as never);
    const req = new NextRequest("http://localhost/api/shopping-list/10", { method: "DELETE" });
    const res = await DELETE(req, { params: { id: "10" } });
    expect(res.status).toBe(404);
  });

  it("deletes the item and returns 204", async () => {
    vi.mocked(prisma.shoppingListItem.findFirst).mockResolvedValue(mockItem as never);
    vi.mocked(prisma.shoppingListItem.delete).mockResolvedValue(mockItem as never);

    const req = new NextRequest("http://localhost/api/shopping-list/10", { method: "DELETE" });
    const res = await DELETE(req, { params: { id: "10" } });

    expect(res.status).toBe(204);
    expect(prisma.shoppingListItem.delete).toHaveBeenCalledWith({ where: { id: 10 } });
  });

  it("returns 400 for a non-numeric id", async () => {
    const req = new NextRequest("http://localhost/api/shopping-list/abc", { method: "DELETE" });
    const res = await DELETE(req, { params: { id: "abc" } });
    expect(res.status).toBe(400);
  });
});
