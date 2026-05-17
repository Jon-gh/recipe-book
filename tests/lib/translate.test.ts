import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreate = vi.hoisted(() => vi.fn());

vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create: mockCreate };
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    recipeTranslation: { upsert: vi.fn() },
    productTranslation: {
      upsert: vi.fn(),
      findMany: vi.fn(),
    },
    product: { findMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import { prisma } from "@/lib/prisma";
import { translateRecipe, translateProduct, translateMissingProducts } from "@/lib/translate";

function mockClaude(translated: string[]) {
  mockCreate.mockResolvedValueOnce({
    content: [{ type: "text", text: JSON.stringify(translated) }],
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// translateRecipe
// ---------------------------------------------------------------------------
describe("translateRecipe", () => {
  const recipe = {
    id: "r1",
    name: "Pasta",
    instructions: "Boil water",
    notes: "",
    tags: ["italian", "quick"],
  };

  it("calls Claude and upserts a RecipeTranslation", async () => {
    mockClaude(["Pâtes", "Faire bouillir de l'eau", "", "italien", "rapide"]);
    vi.mocked(prisma.recipeTranslation.upsert).mockResolvedValue({} as never);

    await translateRecipe(recipe, "fr");

    expect(mockCreate).toHaveBeenCalledOnce();
    const prompt: string = mockCreate.mock.calls[0][0].messages[0].content;
    expect(prompt).toContain("French");
    expect(prompt).toContain('"Pasta"');

    expect(prisma.recipeTranslation.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { recipeId_locale: { recipeId: "r1", locale: "fr" } },
        create: expect.objectContaining({ name: "Pâtes", locale: "fr" }),
        update: expect.objectContaining({ name: "Pâtes" }),
      })
    );
  });

  it("returns null for unsupported locale", async () => {
    const result = await translateRecipe(recipe, "ja");
    expect(result).toBeNull();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("translates to English when nativeLocale is not English", async () => {
    mockClaude(["Pasta", "Boil the water", "", "italian", "quick"]);
    vi.mocked(prisma.recipeTranslation.upsert).mockResolvedValue({} as never);

    await translateRecipe({ ...recipe, name: "Pâtes", instructions: "Faire bouillir l'eau" }, "en");

    const prompt: string = mockCreate.mock.calls[0][0].messages[0].content;
    expect(prompt).toContain("English");
  });
});

// ---------------------------------------------------------------------------
// translateProduct
// ---------------------------------------------------------------------------
describe("translateProduct", () => {
  const product = { id: 1, name: "tomato" };

  it("translates and upserts a ProductTranslation", async () => {
    mockClaude(["tomate"]);
    vi.mocked(prisma.productTranslation.upsert).mockResolvedValue({} as never);

    await translateProduct(product, "fr");

    expect(mockCreate).toHaveBeenCalledOnce();
    expect(prisma.productTranslation.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { productId_locale: { productId: 1, locale: "fr" } },
        create: { productId: 1, locale: "fr", name: "tomate" },
        update: { name: "tomate" },
      })
    );
  });

  it("returns null for unsupported locale", async () => {
    const result = await translateProduct(product, "ja");
    expect(result).toBeNull();
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// translateMissingProducts
// ---------------------------------------------------------------------------
describe("translateMissingProducts", () => {
  it("skips products that already have a translation", async () => {
    vi.mocked(prisma.productTranslation.findMany).mockResolvedValue([{ productId: 1 }] as never);
    vi.mocked(prisma.product.findMany).mockResolvedValue([{ id: 2, name: "garlic" }] as never);
    mockClaude(["ail"]);
    vi.mocked(prisma.$transaction).mockResolvedValue([]);

    await translateMissingProducts([1, 2], "fr");

    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: [2] } } })
    );
  });

  it("batch-translates missing products and stores them", async () => {
    vi.mocked(prisma.productTranslation.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.product.findMany).mockResolvedValue([
      { id: 1, name: "tomato" },
      { id: 2, name: "garlic" },
    ] as never);
    mockClaude(["tomate", "ail"]);
    vi.mocked(prisma.$transaction).mockResolvedValue([]);

    await translateMissingProducts([1, 2], "fr");

    expect(mockCreate).toHaveBeenCalledOnce();
    expect(prisma.$transaction).toHaveBeenCalledOnce();
  });

  it("does nothing when productIds is empty", async () => {
    await translateMissingProducts([], "fr");
    expect(mockCreate).not.toHaveBeenCalled();
    expect(prisma.productTranslation.findMany).not.toHaveBeenCalled();
  });

  it("does nothing for unsupported locale", async () => {
    await translateMissingProducts([1, 2], "ja");
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
