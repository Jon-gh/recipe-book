import { describe, it, expect } from "vitest";
import { aggregateGroceryList } from "@/lib/grocery-list";

const spaghetti = {
  servings: 4,
  ingredients: [
    { name: "spaghetti", quantity: 400, unit: "g", category: "grains & pulses" },
    { name: "minced beef", quantity: 500, unit: "g", category: "meat & fish" },
    { name: "parmesan", quantity: 50, unit: "g", category: "dairy & eggs" },
  ],
};

const chicken = {
  servings: 2,
  ingredients: [
    { name: "chicken breast", quantity: 300, unit: "g", category: "meat & fish" },
    { name: "parmesan", quantity: 30, unit: "g", category: "dairy & eggs" },
  ],
};

describe("aggregateGroceryList", () => {
  it("returns empty list for empty meal plan", () => {
    expect(aggregateGroceryList([])).toEqual([]);
  });

  it("single recipe same servings returns unscaled quantities", () => {
    const result = aggregateGroceryList([{ targetServings: 4, recipe: spaghetti }]);
    const pasta = result.find((i) => i.name === "spaghetti");
    expect(pasta?.quantity).toBe(400);
  });

  it("single recipe scaled up doubles quantities", () => {
    const result = aggregateGroceryList([{ targetServings: 8, recipe: spaghetti }]);
    const pasta = result.find((i) => i.name === "spaghetti");
    expect(pasta?.quantity).toBe(800);
  });

  it("single recipe scaled down halves quantities", () => {
    const result = aggregateGroceryList([{ targetServings: 2, recipe: spaghetti }]);
    const pasta = result.find((i) => i.name === "spaghetti");
    expect(pasta?.quantity).toBe(200);
  });

  it("two recipes with shared ingredient sums quantities", () => {
    const result = aggregateGroceryList([
      { targetServings: 4, recipe: spaghetti },
      { targetServings: 2, recipe: chicken },
    ]);
    const parm = result.find((i) => i.name === "parmesan");
    expect(parm?.quantity).toBe(80); // 50 + 30
  });

  it("same ingredient with truly different units kept as separate rows", () => {
    const result = aggregateGroceryList([
      { targetServings: 1, recipe: { servings: 1, ingredients: [{ name: "milk", quantity: 200, unit: "ml", category: "dairy & eggs" }] } },
      { targetServings: 1, recipe: { servings: 1, ingredients: [{ name: "milk", quantity: 1, unit: "cup", category: "dairy & eggs" }] } },
    ]);
    expect(result).toHaveLength(2);
  });

  it("result is sorted alphabetically by name", () => {
    const result = aggregateGroceryList([{ targetServings: 4, recipe: spaghetti }]);
    const names = result.map((i) => i.name);
    expect(names).toEqual([...names].sort());
  });

  it("scaling with fractional servings rounds correctly", () => {
    const result = aggregateGroceryList([
      { targetServings: 3, recipe: { servings: 4, ingredients: [{ name: "flour", quantity: 400, unit: "g", category: "grains & pulses" }] } },
    ]);
    const flour = result.find((i) => i.name === "flour");
    expect(flour?.quantity).toBe(300);
  });

  it("all ingredients from multiple recipes are present", () => {
    const result = aggregateGroceryList([
      { targetServings: 4, recipe: spaghetti },
      { targetServings: 2, recipe: chicken },
    ]);
    const names = result.map((i) => i.name);
    expect(names).toContain("spaghetti");
    expect(names).toContain("minced beef");
    expect(names).toContain("chicken breast");
    expect(names).toContain("parmesan");
  });

  it("preserves ingredient units in output", () => {
    const result = aggregateGroceryList([{ targetServings: 4, recipe: spaghetti }]);
    const pasta = result.find((i) => i.name === "spaghetti");
    expect(pasta?.unit).toBe("g");
  });

  it("preserves ingredient category in output", () => {
    const result = aggregateGroceryList([{ targetServings: 4, recipe: spaghetti }]);
    const pasta = result.find((i) => i.name === "spaghetti");
    expect(pasta?.category).toBe("grains & pulses");
  });

  it("ingredient aggregation is case-insensitive on name and unit", () => {
    const result = aggregateGroceryList([
      { targetServings: 1, recipe: { servings: 1, ingredients: [{ name: "Garlic", quantity: 2, unit: "cloves", category: "fruit & veg" }] } },
      { targetServings: 1, recipe: { servings: 1, ingredients: [{ name: "garlic", quantity: 3, unit: "cloves", category: "fruit & veg" }] } },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(5);
  });

  // --- trivial ingredient exclusion ---

  it("excludes water from the grocery list", () => {
    const result = aggregateGroceryList([
      { targetServings: 1, recipe: { servings: 1, ingredients: [
        { name: "water", quantity: 500, unit: "ml", category: "drinks" },
        { name: "pasta", quantity: 200, unit: "g", category: "grains & pulses" },
      ]}},
    ]);
    expect(result.find((i) => i.name.toLowerCase() === "water")).toBeUndefined();
    expect(result).toHaveLength(1);
  });

  it("excludes water case-insensitively", () => {
    const result = aggregateGroceryList([
      { targetServings: 1, recipe: { servings: 1, ingredients: [
        { name: "Water", quantity: 200, unit: "ml", category: "drinks" },
      ]}},
    ]);
    expect(result).toHaveLength(0);
  });

  // --- Tier 1: metric unit conversion ---

  it("merges kg and g entries for the same ingredient", () => {
    const result = aggregateGroceryList([
      { targetServings: 1, recipe: { servings: 1, ingredients: [{ name: "flour", quantity: 0.5, unit: "kg", category: "grains & pulses" }] } },
      { targetServings: 1, recipe: { servings: 1, ingredients: [{ name: "flour", quantity: 200, unit: "g", category: "grains & pulses" }] } },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(700); // 500g + 200g
    expect(result[0].unit).toBe("g");
  });

  it("merges l and ml entries for the same ingredient", () => {
    const result = aggregateGroceryList([
      { targetServings: 1, recipe: { servings: 1, ingredients: [{ name: "stock", quantity: 0.5, unit: "l", category: "canned & jarred" }] } },
      { targetServings: 1, recipe: { servings: 1, ingredients: [{ name: "stock", quantity: 250, unit: "ml", category: "canned & jarred" }] } },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(750);
    expect(result[0].unit).toBe("ml");
  });

  // --- Tier 2: size qualifier stripping ---

  it("merges bunch variants (small bunch, handful, bunch) for the same ingredient", () => {
    const result = aggregateGroceryList([
      { targetServings: 1, recipe: { servings: 1, ingredients: [{ name: "coriander", quantity: 1, unit: "handful", category: "fruit & veg" }] } },
      { targetServings: 1, recipe: { servings: 1, ingredients: [{ name: "coriander", quantity: 1, unit: "small bunch", category: "fruit & veg" }] } },
      { targetServings: 1, recipe: { servings: 1, ingredients: [{ name: "coriander", quantity: 0.5, unit: "bunch", category: "fruit & veg" }] } },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(2.5);
    expect(result[0].unit).toBe("bunch");
  });

  it("merges clove variants (fat clove, small cloves, clove) for the same ingredient", () => {
    const result = aggregateGroceryList([
      { targetServings: 1, recipe: { servings: 1, ingredients: [{ name: "garlic", quantity: 2, unit: "fat clove", category: "fruit & veg" }] } },
      { targetServings: 1, recipe: { servings: 1, ingredients: [{ name: "garlic", quantity: 2, unit: "cloves", category: "fruit & veg" }] } },
      { targetServings: 1, recipe: { servings: 1, ingredients: [{ name: "garlic", quantity: 4, unit: "small cloves", category: "fruit & veg" }] } },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(8);
    expect(result[0].unit).toBe("clove");
  });

  it("normalises unit spelling variants (handfuls, bunches → bunch)", () => {
    const result = aggregateGroceryList([
      { targetServings: 1, recipe: { servings: 1, ingredients: [{ name: "parsley", quantity: 2, unit: "handfuls", category: "fruit & veg" }] } },
      { targetServings: 1, recipe: { servings: 1, ingredients: [{ name: "parsley", quantity: 1, unit: "bunches", category: "fruit & veg" }] } },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(3);
    expect(result[0].unit).toBe("bunch");
  });
});
