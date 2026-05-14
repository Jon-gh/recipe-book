import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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

const mockFetch = vi.fn();
global.fetch = mockFetch;

function mockDeepL(translations: string[]) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ translations: translations.map((text) => ({ text })) }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.DEEPL_API_KEY = "test-key";
});

afterEach(() => {
  delete process.env.DEEPL_API_KEY;
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

  it("calls DeepL and upserts a RecipeTranslation", async () => {
    mockDeepL(["Pâtes", "Faire bouillir de l'eau", "", "italien", "rapide"]);
    vi.mocked(prisma.recipeTranslation.upsert).mockResolvedValue({} as never);

    await translateRecipe(recipe, "fr");

    expect(mockFetch).toHaveBeenCalledOnce();
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.target_lang).toBe("FR");
    expect(body.text).toEqual(["Pasta", "Boil water", "", "italian", "quick"]);

    expect(prisma.recipeTranslation.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { recipeId_locale: { recipeId: "r1", locale: "fr" } },
        create: expect.objectContaining({ name: "Pâtes", locale: "fr" }),
        update: expect.objectContaining({ name: "Pâtes" }),
      })
    );
  });

  it("returns null and skips DeepL when DEEPL_API_KEY is not set", async () => {
    delete process.env.DEEPL_API_KEY;
    const result = await translateRecipe(recipe, "fr");
    expect(result).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns null for unsupported locale", async () => {
    const result = await translateRecipe(recipe, "ja");
    expect(result).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("translates to English when nativeLocale is not English", async () => {
    mockDeepL(["Pasta", "Boil the water", "", "italian", "quick"]);
    vi.mocked(prisma.recipeTranslation.upsert).mockResolvedValue({} as never);

    await translateRecipe({ ...recipe, name: "Pâtes", instructions: "Faire bouillir l'eau" }, "en");

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.target_lang).toBe("EN");
  });
});

// ---------------------------------------------------------------------------
// translateProduct
// ---------------------------------------------------------------------------
describe("translateProduct", () => {
  const product = { id: 1, name: "tomato" };

  it("translates and upserts a ProductTranslation", async () => {
    mockDeepL(["tomate"]);
    vi.mocked(prisma.productTranslation.upsert).mockResolvedValue({} as never);

    await translateProduct(product, "fr");

    expect(mockFetch).toHaveBeenCalledOnce();
    expect(prisma.productTranslation.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { productId_locale: { productId: 1, locale: "fr" } },
        create: { productId: 1, locale: "fr", name: "tomate" },
        update: { name: "tomate" },
      })
    );
  });

  it("returns null and skips when DEEPL_API_KEY is not set", async () => {
    delete process.env.DEEPL_API_KEY;
    const result = await translateProduct(product, "es");
    expect(result).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// translateMissingProducts
// ---------------------------------------------------------------------------
describe("translateMissingProducts", () => {
  it("skips products that already have a translation", async () => {
    vi.mocked(prisma.productTranslation.findMany).mockResolvedValue([{ productId: 1 }] as never);
    vi.mocked(prisma.product.findMany).mockResolvedValue([{ id: 2, name: "garlic" }] as never);
    mockDeepL(["ail"]);
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
    mockDeepL(["tomate", "ail"]);
    vi.mocked(prisma.$transaction).mockResolvedValue([]);

    await translateMissingProducts([1, 2], "fr");

    expect(mockFetch).toHaveBeenCalledOnce();
    expect(prisma.$transaction).toHaveBeenCalledOnce();
  });

  it("does nothing when productIds is empty", async () => {
    await translateMissingProducts([], "fr");
    expect(mockFetch).not.toHaveBeenCalled();
    expect(prisma.productTranslation.findMany).not.toHaveBeenCalled();
  });

  it("does nothing when DEEPL_API_KEY is not set", async () => {
    delete process.env.DEEPL_API_KEY;
    await translateMissingProducts([1, 2], "fr");
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
