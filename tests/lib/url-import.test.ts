import { describe, it, expect } from "vitest";
import {
  parseIngredientString,
  parseJsonLdInstructions,
  mapJsonLdRecipe,
  tryJsonLd,
  stripHtml,
} from "@/lib/url-import";

// ---------------------------------------------------------------------------
// parseIngredientString
// ---------------------------------------------------------------------------
describe("parseIngredientString", () => {
  it("parses integer quantity with unit", () => {
    expect(parseIngredientString("200g flour")).toMatchObject({ name: "flour", quantity: 200, unit: "g" });
  });

  it("parses float quantity", () => {
    expect(parseIngredientString("1.5 tbsp olive oil")).toMatchObject({ quantity: 1.5, unit: "tbsp" });
  });

  it("parses simple fraction", () => {
    expect(parseIngredientString("1/2 tsp salt")).toMatchObject({ quantity: 0.5, unit: "tsp" });
  });

  it("parses mixed fraction", () => {
    expect(parseIngredientString("2 1/2 cups flour")).toMatchObject({ quantity: 2.5, unit: "cups" });
  });

  it("extracts preparation after comma", () => {
    expect(parseIngredientString("2 cloves garlic, finely chopped")).toMatchObject({
      name: "garlic",
      preparation: "finely chopped",
    });
  });

  it("falls back to full string as name when no quantity found", () => {
    expect(parseIngredientString("a pinch of salt")).toMatchObject({ name: "a pinch of salt", quantity: 1, unit: "" });
  });

  it("strips surrounding whitespace", () => {
    const result = parseIngredientString("  100g butter  ") as { name: string };
    expect(result.name).toBe("butter");
  });
});

// ---------------------------------------------------------------------------
// parseJsonLdInstructions
// ---------------------------------------------------------------------------
describe("parseJsonLdInstructions", () => {
  it("returns plain string as-is", () => {
    expect(parseJsonLdInstructions("Step 1: boil water")).toBe("Step 1: boil water");
  });

  it("joins list of strings with newline", () => {
    expect(parseJsonLdInstructions(["Step 1", "Step 2"])).toBe("Step 1\nStep 2");
  });

  it("extracts text from HowToStep objects", () => {
    expect(parseJsonLdInstructions([{ "@type": "HowToStep", text: "Chop onions" }])).toBe("Chop onions");
  });

  it("returns empty string for empty list", () => {
    expect(parseJsonLdInstructions([])).toBe("");
  });

  it("returns empty string for unrecognised type", () => {
    expect(parseJsonLdInstructions(42)).toBe("");
  });
});

// ---------------------------------------------------------------------------
// mapJsonLdRecipe
// ---------------------------------------------------------------------------
describe("mapJsonLdRecipe", () => {
  const base = {
    "@type": "Recipe",
    name: "Pancakes",
    recipeYield: "4 servings",
    recipeIngredient: ["200g flour", "2 eggs"],
    recipeInstructions: "Mix and cook.",
    keywords: "breakfast, quick",
  };

  it("extracts name", () => {
    expect(mapJsonLdRecipe(base)).toMatchObject({ name: "Pancakes" });
  });

  it("extracts servings from yield string", () => {
    expect(mapJsonLdRecipe(base)).toMatchObject({ servings: 4 });
  });

  it("extracts servings from list format", () => {
    expect(mapJsonLdRecipe({ ...base, recipeYield: ["2"] })).toMatchObject({ servings: 2 });
  });

  it("defaults servings to 4 when missing", () => {
    const { recipeYield: _, ...rest } = base;
    expect(mapJsonLdRecipe(rest)).toMatchObject({ servings: 4 });
  });

  it("parses ingredients", () => {
    const result = mapJsonLdRecipe(base) as { ingredients: object[] };
    expect(result.ingredients).toHaveLength(2);
  });

  it("extracts instructions", () => {
    expect(mapJsonLdRecipe(base)).toMatchObject({ instructions: "Mix and cook." });
  });

  it("extracts tags from keywords string", () => {
    const result = mapJsonLdRecipe(base) as { tags: string[] };
    expect(result.tags).toContain("breakfast");
    expect(result.tags).toContain("quick");
  });

  it("extracts tags from recipeCuisine", () => {
    const result = mapJsonLdRecipe({ ...base, recipeCuisine: "Italian" }) as { tags: string[] };
    expect(result.tags).toContain("italian");
  });

  it("caps tags at 5", () => {
    const result = mapJsonLdRecipe({
      ...base,
      keywords: "a, b, c, d, e, f, g",
    }) as { tags: string[] };
    expect(result.tags.length).toBeLessThanOrEqual(5);
  });

  it("deduplicates tags", () => {
    const result = mapJsonLdRecipe({ ...base, keywords: "italian, italian" }) as { tags: string[] };
    expect(result.tags.filter((t) => t === "italian")).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// tryJsonLd
// ---------------------------------------------------------------------------
describe("tryJsonLd", () => {
  it("extracts recipe from JSON-LD script tag", () => {
    const html = `<html><head><script type="application/ld+json">{"@type":"Recipe","name":"Test","recipeYield":"2"}</script></head></html>`;
    expect(tryJsonLd(html)).toMatchObject({ name: "Test" });
  });

  it("extracts recipe from @graph", () => {
    const html = `<script type="application/ld+json">{"@graph":[{"@type":"Recipe","name":"Graph Recipe","recipeYield":"1"}]}</script>`;
    expect(tryJsonLd(html)).toMatchObject({ name: "Graph Recipe" });
  });

  it("returns null when no recipe type found", () => {
    const html = `<script type="application/ld+json">{"@type":"WebPage","name":"Home"}</script>`;
    expect(tryJsonLd(html)).toBeNull();
  });

  it("returns null when no JSON-LD present", () => {
    expect(tryJsonLd("<html><body>No structured data</body></html>")).toBeNull();
  });

  it("skips malformed JSON-LD and continues", () => {
    const html = `
      <script type="application/ld+json">NOT JSON</script>
      <script type="application/ld+json">{"@type":"Recipe","name":"Valid","recipeYield":"2"}</script>
    `;
    expect(tryJsonLd(html)).toMatchObject({ name: "Valid" });
  });
});

// ---------------------------------------------------------------------------
// stripHtml
// ---------------------------------------------------------------------------
describe("stripHtml", () => {
  it("removes HTML tags", () => {
    expect(stripHtml("<p>Hello world</p>")).toContain("Hello world");
  });

  it("removes script tags and content", () => {
    const result = stripHtml("<script>alert('xss')</script><p>Recipe</p>");
    expect(result).not.toContain("alert");
    expect(result).toContain("Recipe");
  });

  it("removes nav and footer tags", () => {
    const result = stripHtml("<nav>Navigation</nav><p>Content</p><footer>Footer</footer>");
    expect(result).not.toContain("Navigation");
    expect(result).not.toContain("Footer");
    expect(result).toContain("Content");
  });

  it("decodes HTML entities", () => {
    expect(stripHtml("&amp; &lt; &gt;")).toContain("& < >");
  });
});
