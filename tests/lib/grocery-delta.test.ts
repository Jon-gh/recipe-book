import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/categories", () => ({
  categoryIsStaple: (cat: string) => cat === "spices & herbs" || cat === "condiments & sauces",
}));

import { applyGroceryDelta } from "@/lib/grocery-delta";

function makeTx(existing: { id: number; quantity: number; unit: string } | null = null) {
  return {
    shoppingListItem: {
      findFirst: vi.fn().mockResolvedValue(existing),
      create: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
    },
    product: {
      findUnique: vi.fn().mockResolvedValue({ name: "pasta" }),
    },
  };
}

const pasta = { productId: 1, category: "grains & pulses", quantity: 100, unit: "g" };
const cumin = { productId: 2, category: "spices & herbs", quantity: 1, unit: "tsp" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("applyGroceryDelta — add (direction=1)", () => {
  it("creates a new row when no existing row", async () => {
    const tx = makeTx(null);
    await applyGroceryDelta("u1", 2, 2, [pasta], tx as never);
    expect(tx.shoppingListItem.create).toHaveBeenCalledWith({
      data: { userId: "u1", productId: 1, quantity: 100, unit: "g" },
    });
  });

  it("merges into existing row by adding quantity", async () => {
    const tx = makeTx({ id: 10, quantity: 200, unit: "g" });
    await applyGroceryDelta("u1", 2, 2, [pasta], tx as never);
    expect(tx.shoppingListItem.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { quantity: 300 },
    });
  });

  it("scales by targetServings/recipeServings", async () => {
    const tx = makeTx(null);
    await applyGroceryDelta("u1", 2, 4, [pasta], tx as never);
    expect(tx.shoppingListItem.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ quantity: 200 }) })
    );
  });

  it("skips staple-category ingredients", async () => {
    const tx = makeTx(null);
    await applyGroceryDelta("u1", 2, 2, [cumin], tx as never);
    expect(tx.shoppingListItem.create).not.toHaveBeenCalled();
    expect(tx.shoppingListItem.findFirst).not.toHaveBeenCalled();
  });

  it("normalises unit (kg → g, factor applied)", async () => {
    const kgPasta = { productId: 1, category: "grains & pulses", quantity: 0.5, unit: "kg" };
    const tx = makeTx(null);
    await applyGroceryDelta("u1", 1, 1, [kgPasta], tx as never);
    expect(tx.shoppingListItem.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ quantity: 500, unit: "g" }) })
    );
  });

  it("skips trivial ingredient (water)", async () => {
    const water = { productId: 5, category: "drinks", quantity: 500, unit: "ml" };
    const tx = makeTx(null);
    (tx.product.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ name: "water" });
    await applyGroceryDelta("u1", 1, 1, [water], tx as never);
    expect(tx.shoppingListItem.create).not.toHaveBeenCalled();
  });
});

describe("applyGroceryDelta — subtract (direction=-1)", () => {
  it("subtracts from existing row", async () => {
    const tx = makeTx({ id: 10, quantity: 200, unit: "g" });
    await applyGroceryDelta("u1", 2, 2, [pasta], tx as never, -1);
    expect(tx.shoppingListItem.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { quantity: 100 },
    });
  });

  it("deletes row when subtraction reaches zero", async () => {
    const tx = makeTx({ id: 10, quantity: 100, unit: "g" });
    await applyGroceryDelta("u1", 2, 2, [pasta], tx as never, -1);
    expect(tx.shoppingListItem.delete).toHaveBeenCalledWith({ where: { id: 10 } });
  });

  it("deletes row when subtraction goes below zero", async () => {
    const tx = makeTx({ id: 10, quantity: 50, unit: "g" });
    await applyGroceryDelta("u1", 2, 2, [pasta], tx as never, -1);
    expect(tx.shoppingListItem.delete).toHaveBeenCalledWith({ where: { id: 10 } });
  });

  it("no-op when no existing row and direction is -1", async () => {
    const tx = makeTx(null);
    await applyGroceryDelta("u1", 2, 2, [pasta], tx as never, -1);
    expect(tx.shoppingListItem.create).not.toHaveBeenCalled();
    expect(tx.shoppingListItem.update).not.toHaveBeenCalled();
    expect(tx.shoppingListItem.delete).not.toHaveBeenCalled();
  });

  it("skips staple-category ingredients when subtracting", async () => {
    const tx = makeTx({ id: 10, quantity: 5, unit: "tsp" });
    await applyGroceryDelta("u1", 2, 2, [cumin], tx as never, -1);
    expect(tx.shoppingListItem.findFirst).not.toHaveBeenCalled();
  });
});
