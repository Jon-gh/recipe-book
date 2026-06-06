// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockVibrate = vi.fn();
Object.defineProperty(navigator, "vibrate", {
  value: mockVibrate,
  configurable: true,
  writable: true,
});
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SWRConfig } from "swr";
import RecipeDetailPage from "@/app/recipes/[id]/page";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: vi.fn() }),
  useParams: () => ({ id: "1" }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, className, "aria-label": ariaLabel }: { href: string; children: React.ReactNode; className?: string; "aria-label"?: string }) => (
    <a href={href} className={className} aria-label={ariaLabel}>{children}</a>
  ),
}));

vi.mock("@/components/RecipeForm", () => ({
  default: () => <div data-testid="recipe-form">RecipeForm</div>,
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockRecipe = {
  id: "1",
  name: "Pasta Carbonara",
  servings: 4,
  tags: ["Italian"],
  favourite: false,
  ingredients: [
    {
      id: 1,
      productId: 1,
      quantity: 400,
      unit: "g",
      preparation: "",
      recipeId: "1",
      product: { id: 1, name: "pasta", category: "grains & pulses", defaultUnit: "g", defaultQuantity: 1, source: "system" },
    },
    {
      id: 2,
      productId: 2,
      quantity: 3,
      unit: "",
      preparation: "",
      recipeId: "1",
      product: { id: 2, name: "eggs", category: "dairy & eggs", defaultUnit: "", defaultQuantity: 1, source: "system" },
    },
  ],
  instructions: "Cook pasta.",
  notes: null,
};

function renderPage() {
  return render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <RecipeDetailPage />
    </SWRConfig>
  );
}

beforeEach(() => {
  mockFetch.mockReset();
  mockFetch.mockImplementation((url: string) => {
    if (url === "/api/shopping-list") {
      return Promise.resolve({ ok: true, json: async () => [] });
    }
    return Promise.resolve({ ok: true, json: async () => mockRecipe });
  });
  mockVibrate.mockClear();
  mockPush.mockClear();
});

describe("RecipeDetailPage — favourite toggle", () => {
  it("shows unfilled star when recipe is not a favourite", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Pasta Carbonara")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Add to favourites" })).toBeInTheDocument();
  });

  it("shows filled star when recipe is a favourite", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url === "/api/shopping-list") return Promise.resolve({ ok: true, json: async () => [] });
      return Promise.resolve({ ok: true, json: async () => ({ ...mockRecipe, favourite: true }) });
    });
    renderPage();
    await waitFor(() => expect(screen.getByText("Pasta Carbonara")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Remove from favourites" })).toBeInTheDocument();
  });

  it("calls PUT with favourite:true when toggling on", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Pasta Carbonara")).toBeInTheDocument());

    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ ...mockRecipe, favourite: true }) });
    await userEvent.click(screen.getByRole("button", { name: "Add to favourites" }));

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/recipes/1",
      expect.objectContaining({ method: "PUT", body: expect.stringContaining('"favourite":true') })
    );
  });

  it("calls PUT with favourite:false when toggling off", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url === "/api/shopping-list") return Promise.resolve({ ok: true, json: async () => [] });
      return Promise.resolve({ ok: true, json: async () => ({ ...mockRecipe, favourite: true }) });
    });
    renderPage();
    await waitFor(() => expect(screen.getByText("Pasta Carbonara")).toBeInTheDocument());

    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ ...mockRecipe, favourite: false }) });
    await userEvent.click(screen.getByRole("button", { name: "Remove from favourites" }));

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/recipes/1",
      expect.objectContaining({ method: "PUT", body: expect.stringContaining('"favourite":false') })
    );
  });
});

describe("RecipeDetailPage — ⋯ actions menu", () => {
  it("back link navigates to /recipes", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Pasta Carbonara")).toBeInTheDocument());
    expect(screen.getByRole("link", { name: "Back to recipes" })).toHaveAttribute("href", "/recipes");
  });

  it("opens with Edit Recipe, Duplicate and Delete Recipe options", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Pasta Carbonara")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "More options" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Edit Recipe" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Duplicate" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Delete Recipe" })).toBeInTheDocument();
    });
  });

  it("Edit Recipe opens the edit bottom sheet", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Pasta Carbonara")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "More options" }));
    await userEvent.click(await screen.findByRole("button", { name: "Edit Recipe" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Edit Recipe" })).toBeInTheDocument();
    });
  });

  it("Duplicate calls POST /duplicate and navigates to the copy", async () => {
    const copy = { ...mockRecipe, id: "2", name: "Pasta Carbonara (copy)" };
    mockFetch.mockImplementation((url: string, options?: RequestInit) => {
      const method = (options?.method ?? "GET").toUpperCase();
      if (url === "/api/shopping-list") return Promise.resolve({ ok: true, json: async () => [] });
      if (url === `/api/recipes/1/duplicate` && method === "POST") return Promise.resolve({ ok: true, json: async () => copy });
      return Promise.resolve({ ok: true, json: async () => mockRecipe });
    });

    renderPage();
    await waitFor(() => expect(screen.getByText("Pasta Carbonara")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "More options" }));
    await userEvent.click(await screen.findByRole("button", { name: "Duplicate" }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/recipes/1/duplicate", { method: "POST" });
      expect(mockPush).toHaveBeenCalledWith("/recipes/2");
    });
  });

  it("Delete Recipe shows confirmation sheet then calls DELETE", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Pasta Carbonara")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "More options" }));
    const allDeleteBtns = await screen.findAllByRole("button", { name: "Delete Recipe" });
    await userEvent.click(allDeleteBtns[0]);

    // Confirmation sheet appears
    const confirmBtns = await screen.findAllByRole("button", { name: "Delete Recipe" });
    await userEvent.click(confirmBtns[confirmBtns.length - 1]);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/recipes/1", { method: "DELETE" });
    });
  });
});

describe("RecipeDetailPage — visual refresh", () => {
  it("shows the recipe food emoji in the header", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Pasta Carbonara")).toBeInTheDocument());
    expect(screen.getAllByText("🍝").length).toBeGreaterThan(0);
  });

  it("shows ingredient emoji bullet for each ingredient", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Pasta Carbonara")).toBeInTheDocument());
    // eggs → 🥚
    expect(screen.getByText("🥚")).toBeInTheDocument();
  });

  it("renders instructions as numbered step chips", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Pasta Carbonara")).toBeInTheDocument());
    expect(screen.getByText("①")).toBeInTheDocument();
  });

  it("renders multi-paragraph instructions as multiple numbered steps", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url === "/api/shopping-list") return Promise.resolve({ ok: true, json: async () => [] });
      return Promise.resolve({ ok: true, json: async () => ({ ...mockRecipe, instructions: "Step one.\n\nStep two.\n\nStep three." }) });
    });
    renderPage();
    await waitFor(() => expect(screen.getByText("Pasta Carbonara")).toBeInTheDocument());
    expect(screen.getByText("①")).toBeInTheDocument();
    expect(screen.getByText("②")).toBeInTheDocument();
    expect(screen.getByText("③")).toBeInTheDocument();
  });
});

describe("RecipeDetailPage — haptic feedback", () => {
  it("vibrates on favourite toggle", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Pasta Carbonara")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "Add to favourites" }));

    expect(mockVibrate).toHaveBeenCalled();
  });

  it("vibrates on delete confirmation", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Pasta Carbonara")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "More options" }));
    const allDeleteBtns = await screen.findAllByRole("button", { name: "Delete Recipe" });
    await userEvent.click(allDeleteBtns[0]);
    const confirmBtns = await screen.findAllByRole("button", { name: "Delete Recipe" });
    await userEvent.click(confirmBtns[confirmBtns.length - 1]);

    expect(mockVibrate).toHaveBeenCalled();
  });

  it("vibrates on add to plan confirmation", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Pasta Carbonara")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: /add to meal plan/i }));

    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
    const allAddBtns = await screen.findAllByRole("button", { name: "Add to Meal Plan" });
    await userEvent.click(allAddBtns[allAddBtns.length - 1]);

    expect(mockVibrate).toHaveBeenCalled();
  });
});

describe("RecipeDetailPage — staple check-in after adding to plan", () => {
  const mockRecipeWithStaples = {
    ...mockRecipe,
    ingredients: [
      {
        id: 2,
        productId: 10,
        quantity: 1,
        unit: "tsp",
        preparation: "",
        recipeId: "1",
        product: { id: 10, name: "cumin", category: "spices & herbs", defaultUnit: "jar", defaultQuantity: 1, source: "system" },
      },
    ],
  };

  function setupWithStaples(shoppingList: object[] = []) {
    mockFetch.mockImplementation((url: string, options?: RequestInit) => {
      const method = (options?.method ?? "GET").toUpperCase();
      if (url === `/api/recipes/1`) return Promise.resolve({ ok: true, json: async () => mockRecipeWithStaples });
      if (url === "/api/shopping-list" && method === "GET") return Promise.resolve({ ok: true, json: async () => shoppingList });
      if (url === "/api/meal-plan" && method === "POST") return Promise.resolve({ ok: true, json: async () => ({}) });
      if (url === "/api/shopping-session" && method === "PUT") return Promise.resolve({ ok: true, json: async () => ({}) });
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
  }

  it("does not show check-in sheet when recipe has no staple ingredients", async () => {
    // mockRecipe has only "eggs" in "other" category — no staples
    renderPage();
    await waitFor(() => expect(screen.getByText("Pasta Carbonara")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: /add to meal plan/i }));
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
    const allAddBtns = await screen.findAllByRole("button", { name: "Add to Meal Plan" });
    await userEvent.click(allAddBtns[allAddBtns.length - 1]);

    await waitFor(() =>
      expect(screen.queryByText("Check your pantry")).not.toBeInTheDocument()
    );
  });

  it("shows check-in sheet when recipe has staple ingredients not in shopping list", async () => {
    setupWithStaples([]);
    renderPage();
    await waitFor(() => expect(screen.getByText("Pasta Carbonara")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: /add to meal plan/i }));
    const allAddBtns = await screen.findAllByRole("button", { name: "Add to Meal Plan" });
    await userEvent.click(allAddBtns[allAddBtns.length - 1]);

    await waitFor(() =>
      expect(screen.getByText("Check your pantry")).toBeInTheDocument()
    );
    // cumin appears both in the recipe and the check-in sheet
    expect(screen.getAllByText("cumin").length).toBeGreaterThanOrEqual(1);
  });

  it("tapping Review Later calls PUT /api/shopping-session with needsStapleReview true", async () => {
    setupWithStaples([]);
    renderPage();
    await waitFor(() => expect(screen.getByText("Pasta Carbonara")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: /add to meal plan/i }));
    const allAddBtns = await screen.findAllByRole("button", { name: "Add to Meal Plan" });
    await userEvent.click(allAddBtns[allAddBtns.length - 1]);

    await waitFor(() => expect(screen.getByText("Check your pantry")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Review Later" }));

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/shopping-session",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ needsStapleReview: true }),
      })
    );
  });
});
