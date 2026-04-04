import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/extract-recipe", () => ({
  extractRecipeFromText: vi.fn(),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

import { extractRecipeFromText } from "@/lib/extract-recipe";
import { POST } from "@/app/api/recipes/import/url/route";

const mockAiRecipe = {
  name: "Pancakes",
  servings: 4,
  ingredients: [
    { name: "flour", quantity: 200, unit: "g", preparation: "", category: "grains & pulses" },
    { name: "egg", quantity: 2, unit: "", preparation: "beaten", category: "dairy & eggs" },
  ],
  instructions: "Mix and cook.",
  tags: ["breakfast"],
};

beforeEach(() => vi.clearAllMocks());

// ---------------------------------------------------------------------------
// POST /api/recipes/import/url
// ---------------------------------------------------------------------------
describe("POST /api/recipes/import/url", () => {
  it("returns 400 when url is missing", async () => {
    const req = new NextRequest("http://localhost/api/recipes/import/url", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when fetch fails", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));
    const req = new NextRequest("http://localhost/api/recipes/import/url", {
      method: "POST",
      body: JSON.stringify({ url: "https://example.com/recipe" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("passes JSON-LD data through Claude when structured data is found", async () => {
    const htmlWithJsonLd = `<html><head>
      <script type="application/ld+json">
        {"@type":"Recipe","name":"Pancakes","recipeYield":"4 servings","recipeIngredient":["200g flour","2 eggs"],"recipeInstructions":"Mix and cook.","keywords":"breakfast"}
      </script>
    </head><body><p>Pancakes recipe</p></body></html>`;

    mockFetch.mockResolvedValue({ ok: true, text: async () => htmlWithJsonLd });
    vi.mocked(extractRecipeFromText).mockResolvedValue(mockAiRecipe);

    const req = new NextRequest("http://localhost/api/recipes/import/url", {
      method: "POST",
      body: JSON.stringify({ url: "https://example.com/recipe" }),
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(vi.mocked(extractRecipeFromText)).toHaveBeenCalledOnce();
    const body = await res.json();
    expect(body.ingredients[0].category).toBe("grains & pulses");
    expect(body.ingredients[1].preparation).toBe("beaten");
  });

  it("passes stripped HTML through Claude when no JSON-LD found", async () => {
    const htmlWithoutJsonLd = `<html><body><h1>My Recipe</h1><p>Mix flour and eggs.</p></body></html>`;

    mockFetch.mockResolvedValue({ ok: true, text: async () => htmlWithoutJsonLd });
    vi.mocked(extractRecipeFromText).mockResolvedValue(mockAiRecipe);

    const req = new NextRequest("http://localhost/api/recipes/import/url", {
      method: "POST",
      body: JSON.stringify({ url: "https://example.com/recipe" }),
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(vi.mocked(extractRecipeFromText)).toHaveBeenCalledOnce();
  });

  it("returns 422 when stripped HTML is empty", async () => {
    mockFetch.mockResolvedValue({ ok: true, text: async () => "<html><body></body></html>" });

    const req = new NextRequest("http://localhost/api/recipes/import/url", {
      method: "POST",
      body: JSON.stringify({ url: "https://example.com/recipe" }),
    });
    const res = await POST(req);

    expect(res.status).toBe(422);
    expect(vi.mocked(extractRecipeFromText)).not.toHaveBeenCalled();
  });
});
