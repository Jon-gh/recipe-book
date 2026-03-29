import { describe, it, expect } from "vitest";
import { aggregateGroceryList } from "@/lib/grocery-list";

const spaghetti = {
  servings: 4,
  ingredients: [
    { name: "spaghetti", quantity: 400, unit: "g" },
    { name: "minced beef", quantity: 500, unit: "g" },
    { name: "parmesan", quantity: 50, unit: "g" },
  ],
};

const chicken = {
  servings: 2,
  ingredients: [
    { name: "chicken breast", quantity: 300, unit: "g" },
    { name: "parmesan", quantity: 30, unit: "g" },
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

  it("same ingredient with different units kept separate", () => {
    const result = aggregateGroceryList([
      { targetServings: 1, recipe: { servings: 1, ingredients: [{ name: "milk", quantity: 200, unit: "ml" }] } },
      { targetServings: 1, recipe: { servings: 1, ingredients: [{ name: "milk", quantity: 1, unit: "cup" }] } },
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
      { targetServings: 3, recipe: { servings: 4, ingredients: [{ name: "flour", quantity: 400, unit: "g" }] } },
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

  it("ingredient aggregation is case-insensitive on name and unit", () => {
    const result = aggregateGroceryList([
      { targetServings: 1, recipe: { servings: 1, ingredients: [{ name: "Garlic", quantity: 2, unit: "cloves" }] } },
      { targetServings: 1, recipe: { servings: 1, ingredients: [{ name: "garlic", quantity: 3, unit: "cloves" }] } },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(5);
  });
});
