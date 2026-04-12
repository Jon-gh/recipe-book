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

const mockRecipes = [
  { id: "r1", name: "Pasta", servings: 4, tags: ["Italian"], favourite: false, ingredients: [] },
  { id: "r2", name: "Stir-Fry", servings: 2, tags: ["quick"], favourite: true, ingredients: [] },
];

const mockEntries = [
  {
    id: 1,
    targetServings: 4,
    recipeId: "r1",
    recipe: { id: "r1", name: "Pasta", servings: 4, tags: ["Italian"], favourite: false, ingredients: [] },
  },
];

function renderPage() {
  return render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <MealPlanPage />
    </SWRConfig>
  );
}

beforeEach(() => {
  mockFetch.mockClear();
});

describe("MealPlanPage", () => {
  it("shows loading state initially", () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => [] });
    renderPage();
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("shows empty state when no entries", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => [] });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("No recipes in the plan yet.")).toBeInTheDocument();
    });
  });

  it("renders meal plan entries after loading", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockEntries }) // meal-plan
      .mockResolvedValueOnce({ ok: true, json: async () => mockRecipes }); // recipes
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Pasta")).toBeInTheDocument();
    });
  });

  it("shows total servings summary", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockEntries })
      .mockResolvedValueOnce({ ok: true, json: async () => mockRecipes });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/1 recipe · 4 total servings/)).toBeInTheDocument();
    });
  });

  it("filters recipe search results", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => mockRecipes });
    renderPage();
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));

    await userEvent.type(screen.getByPlaceholderText("Search recipes…"), "pasta");
    expect(screen.getByText("Pasta")).toBeInTheDocument();
    expect(screen.queryByText("Stir-Fry")).not.toBeInTheDocument();
  });

  it("removes an entry when clicking ✕ and revalidates from server", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockEntries }) // initial meal-plan
      .mockResolvedValueOnce({ ok: true, json: async () => mockRecipes }) // recipes
      .mockResolvedValueOnce({ status: 204, json: async () => null }) // DELETE
      .mockResolvedValueOnce({ ok: true, json: async () => [] }); // revalidation — server returns empty list

    renderPage();
    await waitFor(() => expect(screen.getByText("Pasta")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "Remove" }));

    // UI updates from the revalidation response (empty list)
    await waitFor(() => {
      expect(screen.getByText("No recipes in the plan yet.")).toBeInTheDocument();
    });
    expect(mockFetch).toHaveBeenCalledWith("/api/meal-plan/1", { method: "DELETE" });
  });

  it("adds entry when selecting a recipe and clicking Add to Plan, then shows it after revalidation", async () => {
    const newEntry = {
      id: 2,
      targetServings: 4,
      recipeId: "r1",
      recipe: mockRecipes[0],
    };

    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => [] })         // initial meal-plan
      .mockResolvedValueOnce({ ok: true, json: async () => mockRecipes }) // recipes
      .mockResolvedValueOnce({ ok: true, json: async () => newEntry })   // POST response
      .mockResolvedValueOnce({ ok: true, json: async () => [newEntry] }); // revalidation — server returns new entry

    renderPage();
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));

    await userEvent.type(screen.getByPlaceholderText("Search recipes…"), "Pasta");
    await userEvent.click(screen.getByText("Pasta"));
    await userEvent.click(screen.getByRole("button", { name: "Add to Plan" }));

    // UI updates from the revalidation response (new entry appears)
    await waitFor(() => {
      expect(screen.getByText("1 recipe · 4 total servings")).toBeInTheDocument();
    });
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/meal-plan",
      expect.objectContaining({ method: "POST" })
    );
  });
});
