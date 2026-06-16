import { describe, it, expect } from "vitest";
import { getRecipeEmoji } from "@/lib/recipe-emoji";

describe("getRecipeEmoji — recipe name takes priority", () => {
  it("matches pasta dish name", () => {
    expect(getRecipeEmoji("Spaghetti Carbonara", [])).toBe("🍝");
  });

  it("matches curry dish name", () => {
    expect(getRecipeEmoji("Chicken Tikka Masala", ["chicken", "onion", "garlic"])).toBe("🍛");
  });

  it("matches pizza dish name", () => {
    expect(getRecipeEmoji("Margherita Pizza", ["flour", "tomato", "mozzarella"])).toBe("🍕");
  });

  it("matches soup dish name", () => {
    expect(getRecipeEmoji("Tomato Soup", ["tomato", "onion", "cream"])).toBe("🍲");
  });

  it("matches salad dish name", () => {
    expect(getRecipeEmoji("Greek Salad", ["tomato", "cucumber", "feta"])).toBe("🥗");
  });

  it("matches taco dish name", () => {
    expect(getRecipeEmoji("Fish Tacos", ["fish", "lime", "cabbage"])).toBe("🌮");
  });

  it("matches cake dish name", () => {
    expect(getRecipeEmoji("Chocolate Cake", ["flour", "chocolate", "eggs"])).toBe("🎂");
  });

  it("matches cookie dish name", () => {
    expect(getRecipeEmoji("Chocolate Chip Cookies", ["flour", "chocolate", "butter"])).toBe("🍪");
  });

  it("is case-insensitive on recipe name", () => {
    expect(getRecipeEmoji("PASTA BAKE", [])).toBe("🍝");
    expect(getRecipeEmoji("chicken curry", [])).toBe("🍛");
  });
});

describe("getRecipeEmoji — falls back to ingredient scan", () => {
  it("falls back to ingredient when no dish keyword matches name", () => {
    expect(getRecipeEmoji("Sunday Dinner", ["salmon", "lemon", "dill"])).toBe("🐟");
  });

  it("matches chicken from ingredient when name gives no hint", () => {
    expect(getRecipeEmoji("Grandma's Recipe", ["chicken", "garlic", "herbs"])).toBe("🍗");
  });

  it("returns default emoji when nothing matches", () => {
    expect(getRecipeEmoji("Mystery Dish", ["water", "xanthan gum", "agar"])).toBe("🍳");
    expect(getRecipeEmoji("", [])).toBe("🍳");
  });

  it("skips non-matching ingredients before finding a match", () => {
    expect(getRecipeEmoji("Special Mix", ["water", "xanthan gum", "pasta"])).toBe("🍝");
  });
});
