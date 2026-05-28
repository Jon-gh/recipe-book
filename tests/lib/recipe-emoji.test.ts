import { describe, it, expect } from "vitest";
import { getRecipeEmoji } from "@/lib/recipe-emoji";

describe("getRecipeEmoji", () => {
  it("matches pasta keyword", () => {
    expect(getRecipeEmoji("Pasta Carbonara")).toBe("🍝");
  });

  it("matches chicken keyword", () => {
    expect(getRecipeEmoji("Chicken Tikka Masala")).toBe("🍗");
  });

  it("matches salad keyword", () => {
    expect(getRecipeEmoji("Caesar Salad")).toBe("🥗");
  });

  it("matches pizza keyword", () => {
    expect(getRecipeEmoji("Margherita Pizza")).toBe("🍕");
  });

  it("matches curry keyword", () => {
    expect(getRecipeEmoji("Thai Green Curry")).toBe("🍛");
  });

  it("is case-insensitive", () => {
    expect(getRecipeEmoji("PASTA BOLOGNESE")).toBe("🍝");
    expect(getRecipeEmoji("Chicken Stir Fry")).toBe("🍗");
    expect(getRecipeEmoji("caesar salad")).toBe("🥗");
  });

  it("returns default emoji when no keyword matches", () => {
    expect(getRecipeEmoji("Sunday Roast")).toBe("🍳");
    expect(getRecipeEmoji("")).toBe("🍳");
    expect(getRecipeEmoji("Grandma's Secret")).toBe("🍳");
  });

  it("first keyword in lookup order wins for multi-keyword name", () => {
    // "pasta" appears before "chicken" in the lookup table
    expect(getRecipeEmoji("Chicken Pasta")).toBe("🍝");
  });

  it("matches partial keyword within name", () => {
    expect(getRecipeEmoji("Homemade Spaghetti Sauce")).toBe("🍝");
    expect(getRecipeEmoji("Grilled Salmon Fillet")).toBe("🐟");
  });
});
