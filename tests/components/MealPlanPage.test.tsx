// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SWRConfig } from "swr";
import MealPlanPage from "@/app/meal-plan/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockIngredient = (name: string, category = "other") => ({
  id: 0,
  productId: 0,
  quantity: 1,
  unit: "",
  preparation: "",
  recipeId: "",
  product: { id: 0, name, category, defaultUnit: "", defaultQuantity: 1, source: "system" },
});

const mockRecipes = [
  { id: "r1", name: "Pasta", servings: 4, tags: ["Italian"], favourite: false, ingredients: [mockIngredient("pasta", "grains & pulses")] },
  { id: "r2", name: "Stir-Fry", servings: 2, tags: ["quick"], favourite: true, ingredients: [mockIngredient("beef", "meat & fish")] },
];

const mockEntries = [
  {
    id: 1,
    targetServings: 4,
    recipeId: "r1",
    recipe: { id: "r1", name: "Pasta", servings: 4, tags: ["Italian"], favourite: false, ingredients: [mockIngredient("pasta", "grains & pulses")] },
    scheduledMeals: [],
  },
];

function setupFetch({
  entries = mockEntries as object[],
  recipes = mockRecipes as object[],
  shoppingList = [] as object[],
  session = { weekStart: null, weekEnd: null } as object,
} = {}) {
  mockFetch.mockImplementation((url: string, options?: RequestInit) => {
    const method = (options?.method ?? "GET").toUpperCase();
    if (url === "/api/meal-plan" && method === "GET") {
      return Promise.resolve({ ok: true, json: async () => entries });
    }
    if (url === "/api/recipes" && method === "GET") {
      return Promise.resolve({ ok: true, json: async () => recipes });
    }
    if (url === "/api/shopping-list" && method === "GET") {
      return Promise.resolve({ ok: true, json: async () => shoppingList });
    }
    if (url === "/api/shopping-session" && method === "GET") {
      return Promise.resolve({ ok: true, json: async () => session });
    }
    if (/\/api\/meal-plan\/\d+/.test(url) && method === "DELETE") {
      return Promise.resolve({ status: 204, ok: true, json: async () => null });
    }
    if (/\/api\/meal-plan\/\d+/.test(url) && method === "PATCH") {
      return Promise.resolve({ ok: true, json: async () => entries[0] });
    }
    if (url === "/api/meal-plan" && method === "POST") {
      return Promise.resolve({ ok: true, json: async () => entries[0] });
    }
    return Promise.resolve({ ok: true, json: async () => [] });
  });
}

function renderPage() {
  return render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <MealPlanPage />
    </SWRConfig>
  );
}

beforeEach(() => {
  mockFetch.mockClear();
  setupFetch();
});

describe("MealPlanPage — Plan tab", () => {
  it("shows loading state initially", () => {
    renderPage();
    expect(screen.getByText("Building your week…")).toBeInTheDocument();
  });

  it("shows empty state when no entries", async () => {
    setupFetch({ entries: [] });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Nothing planned yet.")).toBeInTheDocument();
    });
  });

  it("renders meal plan entries after loading", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Pasta")).toBeInTheDocument();
    });
  });

  it("renders entries as pastel cards with food emoji", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Pasta")).toBeInTheDocument());
    expect(screen.getByText("🍝")).toBeInTheDocument();
    const emojiEl = screen.getByText("🍝");
    const card = emojiEl.closest("[class*='bg-']");
    expect(card).not.toBeNull();
  });

  it("shows total servings summary", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/1 recipe · 4 total servings/)).toBeInTheDocument();
    });
  });

  it("filters recipe search results", async () => {
    setupFetch({ entries: [] });
    renderPage();
    await waitFor(() => expect(screen.getByText("Nothing planned yet.")).toBeInTheDocument());

    await userEvent.type(screen.getByPlaceholderText("Search recipes to add…"), "pasta");
    expect(screen.getByText("Pasta")).toBeInTheDocument();
    expect(screen.queryByText("Stir-Fry")).not.toBeInTheDocument();
  });

  it("removes an entry when clicking ✕ and revalidates from server", async () => {
    setupFetch();
    renderPage();
    await waitFor(() => expect(screen.getByText("Pasta")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "Remove from plan" }));

    expect(mockFetch).toHaveBeenCalledWith("/api/meal-plan/1", { method: "DELETE" });
  });

  it("adds entry when selecting a recipe and clicking Add", async () => {
    setupFetch({ entries: [] });
    renderPage();
    await waitFor(() => expect(screen.getByText("Nothing planned yet.")).toBeInTheDocument());

    await userEvent.type(screen.getByPlaceholderText("Search recipes to add…"), "Pasta");
    await userEvent.click(screen.getByText("Pasta"));
    await userEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/meal-plan",
      expect.objectContaining({ method: "POST" })
    );
  });
});

describe("MealPlanPage — ready to cook badge", () => {
  it("shows 'Ready' badge when all non-staple ingredients are not on the shopping list", async () => {
    // pasta is on the shopping list → recipe is NOT ready
    setupFetch({
      shoppingList: [{
        id: 1, quantity: 400, unit: "g",
        product: { id: 0, name: "pasta", category: "grains & pulses", defaultUnit: "g", defaultQuantity: 1, source: "system" },
      }],
    });
    renderPage();
    await waitFor(() => expect(screen.getByText("Pasta")).toBeInTheDocument());
    expect(screen.queryByText("Ready")).not.toBeInTheDocument();
  });

  it("shows 'Ready' badge when shopping list has no matching ingredients", async () => {
    // shopping list is empty → all ingredients are "not on the list" → recipe is ready
    setupFetch({ shoppingList: [] });
    renderPage();
    await waitFor(() => expect(screen.getByText("Pasta")).toBeInTheDocument());
    // Recipe has pasta (productId: 0) and shopping list is empty
    // so no non-staple product is on the list → ready
    await waitFor(() => expect(screen.getByText("Ready")).toBeInTheDocument());
  });
});
