import { describe, it, expect } from "vitest";
import { aggregateGroceryList } from "@/lib/grocery-list";

const p = (id: number, name: string, category: string) => ({ id, name, category, source: "system" });

const spaghetti = {
  servings: 4,
  ingredients: [
    { product: p(1, "spaghetti", "grains & pulses"), quantity: 400, unit: "g" },
    { product: p(2, "minced beef", "meat & fish"), quantity: 500, unit: "g" },
    { product: p(3, "parmesan", "dairy & eggs"), quantity: 50, unit: "g" },
  ],
};

const chicken = {
  servings: 2,
  ingredients: [
    { product: p(4, "chicken breast", "meat & fish"), quantity: 300, unit: "g" },
    { product: p(3, "parmesan", "dairy & eggs"), quantity: 30, unit: "g" },
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
      { targetServings: 1, recipe: { servings: 1, ingredients: [{ product: p(5, "milk", "dairy & eggs"), quantity: 200, unit: "ml" }] } },
      { targetServings: 1, recipe: { servings: 1, ingredients: [{ product: p(5, "milk", "dairy & eggs"), quantity: 1, unit: "cup" }] } },
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
      { targetServings: 3, recipe: { servings: 4, ingredients: [{ product: p(6, "flour", "grains & pulses"), quantity: 400, unit: "g" }] } },
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
      { targetServings: 1, recipe: { servings: 1, ingredients: [{ product: p(7, "Garlic", "fruit & veg"), quantity: 2, unit: "cloves" }] } },
      { targetServings: 1, recipe: { servings: 1, ingredients: [{ product: p(7, "garlic", "fruit & veg"), quantity: 3, unit: "cloves" }] } },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(5);
  });

  // --- trivial ingredient exclusion ---

  it("excludes water from the grocery list", () => {
    const result = aggregateGroceryList([
      { targetServings: 1, recipe: { servings: 1, ingredients: [
        { product: p(8, "water", "drinks"), quantity: 500, unit: "ml" },
        { product: p(9, "pasta", "grains & pulses"), quantity: 200, unit: "g" },
      ]}},
    ]);
    expect(result.find((i) => i.name.toLowerCase() === "water")).toBeUndefined();
    expect(result).toHaveLength(1);
  });

  it("excludes water case-insensitively", () => {
    const result = aggregateGroceryList([
      { targetServings: 1, recipe: { servings: 1, ingredients: [
        { product: p(8, "Water", "drinks"), quantity: 200, unit: "ml" },
      ]}},
    ]);
    expect(result).toHaveLength(0);
  });

  // --- Tier 1: metric unit conversion ---

  it("merges kg and g entries for the same ingredient", () => {
    const result = aggregateGroceryList([
      { targetServings: 1, recipe: { servings: 1, ingredients: [{ product: p(10, "flour", "grains & pulses"), quantity: 0.5, unit: "kg" }] } },
      { targetServings: 1, recipe: { servings: 1, ingredients: [{ product: p(10, "flour", "grains & pulses"), quantity: 200, unit: "g" }] } },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(700); // 500g + 200g
    expect(result[0].unit).toBe("g");
  });

  it("merges l and ml entries for the same ingredient", () => {
    const result = aggregateGroceryList([
      { targetServings: 1, recipe: { servings: 1, ingredients: [{ product: p(11, "stock", "canned & jarred"), quantity: 0.5, unit: "l" }] } },
      { targetServings: 1, recipe: { servings: 1, ingredients: [{ product: p(11, "stock", "canned & jarred"), quantity: 250, unit: "ml" }] } },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(750);
    expect(result[0].unit).toBe("ml");
  });

  // --- Tier 2: size qualifier stripping ---

  it("merges bunch variants (small bunch, handful, bunch) for the same ingredient", () => {
    const result = aggregateGroceryList([
      { targetServings: 1, recipe: { servings: 1, ingredients: [{ product: p(12, "coriander", "fruit & veg"), quantity: 1, unit: "handful" }] } },
      { targetServings: 1, recipe: { servings: 1, ingredients: [{ product: p(12, "coriander", "fruit & veg"), quantity: 1, unit: "small bunch" }] } },
      { targetServings: 1, recipe: { servings: 1, ingredients: [{ product: p(12, "coriander", "fruit & veg"), quantity: 0.5, unit: "bunch" }] } },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(2.5);
    expect(result[0].unit).toBe("bunch");
  });

  it("merges clove variants (fat clove, small cloves, clove) for the same ingredient", () => {
    const result = aggregateGroceryList([
      { targetServings: 1, recipe: { servings: 1, ingredients: [{ product: p(13, "garlic", "fruit & veg"), quantity: 2, unit: "fat clove" }] } },
      { targetServings: 1, recipe: { servings: 1, ingredients: [{ product: p(13, "garlic", "fruit & veg"), quantity: 2, unit: "cloves" }] } },
      { targetServings: 1, recipe: { servings: 1, ingredients: [{ product: p(13, "garlic", "fruit & veg"), quantity: 4, unit: "small cloves" }] } },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(8);
    expect(result[0].unit).toBe("clove");
  });

  it("normalises unit spelling variants (handfuls, bunches → bunch)", () => {
    const result = aggregateGroceryList([
      { targetServings: 1, recipe: { servings: 1, ingredients: [{ product: p(14, "parsley", "fruit & veg"), quantity: 2, unit: "handfuls" }] } },
      { targetServings: 1, recipe: { servings: 1, ingredients: [{ product: p(14, "parsley", "fruit & veg"), quantity: 1, unit: "bunches" }] } },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(3);
    expect(result[0].unit).toBe("bunch");
  });
});
