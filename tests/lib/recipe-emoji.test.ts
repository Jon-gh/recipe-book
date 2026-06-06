import { describe, it, expect } from "vitest";
import { getRecipeEmoji } from "@/lib/recipe-emoji";

describe("getRecipeEmoji", () => {
  it("matches pasta keyword in ingredient list", () => {
    expect(getRecipeEmoji(["pasta", "eggs", "guanciale"])).toBe("🍝");
  });

  it("matches chicken keyword in ingredient list", () => {
    expect(getRecipeEmoji(["chicken", "yogurt", "garlic"])).toBe("🍗");
  });

  it("matches salmon keyword in ingredient list", () => {
    expect(getRecipeEmoji(["salmon", "lemon", "dill"])).toBe("🐟");
  });

  it("returns first matching ingredient emoji (order matters)", () => {
    // pasta appears before chicken in ingredient-emoji keyword table
    expect(getRecipeEmoji(["pasta", "chicken"])).toBe("🍝");
    expect(getRecipeEmoji(["chicken", "pasta"])).toBe("🍗");
  });

  it("is case-insensitive", () => {
    expect(getRecipeEmoji(["PASTA", "EGGS"])).toBe("🍝");
    expect(getRecipeEmoji(["Chicken Breast", "garlic"])).toBe("🍗");
  });

  it("returns default emoji when no ingredient keyword matches", () => {
    expect(getRecipeEmoji(["water", "xanthan gum", "agar"])).toBe("🍳");
    expect(getRecipeEmoji([])).toBe("🍳");
  });

  it("works with canonical English ingredient names regardless of recipe locale", () => {
    // French recipe translated name would break old approach; canonical ingredient names work
    expect(getRecipeEmoji(["chicken", "onion", "tomato"])).toBe("🍗");
    expect(getRecipeEmoji(["beef", "garlic", "wine"])).toBe("🥩");
  });

  it("matches partial keyword within ingredient name", () => {
    expect(getRecipeEmoji(["smoked salmon fillet", "lemon"])).toBe("🐟");
    expect(getRecipeEmoji(["chicken thighs", "garlic"])).toBe("🍗");
  });

  it("skips non-matching ingredients before finding a match", () => {
    expect(getRecipeEmoji(["water", "xanthan gum", "pasta"])).toBe("🍝");
  });
});
