import { describe, it, expect } from "vitest";
import { getIngredientEmoji } from "@/lib/ingredient-emoji";

describe("getIngredientEmoji", () => {
  it("returns specific emoji for a known keyword", () => {
    expect(getIngredientEmoji("garlic", "spices & herbs")).toBe("🧄");
  });

  it("is case-insensitive", () => {
    expect(getIngredientEmoji("EGGS", "dairy & eggs")).toBe("🥚");
    expect(getIngredientEmoji("Butter", "dairy & eggs")).toBe("🧈");
  });

  it("matches on substring (multi-word ingredient name)", () => {
    expect(getIngredientEmoji("smoked salmon fillet", "meat & fish")).toBe("🐟");
    expect(getIngredientEmoji("fresh flat-leaf parsley", "spices & herbs")).toBe("🌿");
  });

  it("falls back to category emoji for unknown ingredient name", () => {
    const result = getIngredientEmoji("xanthan gum", "baking & sweeteners");
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  });

  it("falls back to other category emoji for unknown category", () => {
    const result = getIngredientEmoji("mystery ingredient", "other");
    expect(result).toBe("🛒");
  });

  it("returns a non-empty string for completely unknown name and category", () => {
    const result = getIngredientEmoji("zzz", "unknown-category");
    expect(result).toBe("🛒");
  });

  it("returns correct emoji for olive oil", () => {
    expect(getIngredientEmoji("olive oil", "condiments & sauces")).toBe("🫒");
  });

  it("returns milk emoji for cream", () => {
    expect(getIngredientEmoji("heavy cream", "dairy & eggs")).toBe("🥛");
  });

  it("returns cheese emoji for parmesan", () => {
    expect(getIngredientEmoji("parmesan", "dairy & eggs")).toBe("🧀");
  });
});
