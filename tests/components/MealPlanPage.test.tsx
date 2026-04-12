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
    mockFetch.mockResolvedValue({ json: async () => [] });
    renderPage();
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("shows empty state when no entries", async () => {
    mockFetch.mockResolvedValue({ json: async () => [] });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("No recipes in the plan yet.")).toBeInTheDocument();
    });
  });

  it("renders meal plan entries after loading", async () => {
    mockFetch
      .mockResolvedValueOnce({ json: async () => mockEntries }) // meal-plan
      .mockResolvedValueOnce({ json: async () => mockRecipes }); // recipes
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Pasta")).toBeInTheDocument();
    });
  });

  it("shows total servings summary", async () => {
    mockFetch
      .mockResolvedValueOnce({ json: async () => mockEntries })
      .mockResolvedValueOnce({ json: async () => mockRecipes });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/1 recipe · 4 total servings/)).toBeInTheDocument();
    });
  });

  it("filters recipe search results", async () => {
    mockFetch
      .mockResolvedValueOnce({ json: async () => [] })
      .mockResolvedValueOnce({ json: async () => mockRecipes });
    renderPage();
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));

    await userEvent.type(screen.getByPlaceholderText("Search recipes…"), "pasta");
    expect(screen.getByText("Pasta")).toBeInTheDocument();
    expect(screen.queryByText("Stir-Fry")).not.toBeInTheDocument();
  });

  it("removes an entry when clicking ✕", async () => {
    mockFetch
      .mockResolvedValueOnce({ json: async () => mockEntries }) // initial meal-plan
      .mockResolvedValueOnce({ json: async () => mockRecipes }) // recipes
      .mockResolvedValueOnce({ status: 204, json: async () => null }) // DELETE
      .mockResolvedValueOnce({ json: async () => [] }); // revalidation after delete

    renderPage();
    await waitFor(() => expect(screen.getByText("Pasta")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "Remove" }));
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/meal-plan/1", { method: "DELETE" });
    });
  });

  it("adds entry when selecting a recipe and clicking Add to Plan", async () => {
    const newEntry = {
      id: 2,
      targetServings: 4,
      recipeId: "r1",
      recipe: mockRecipes[0],
    };

    mockFetch
      .mockResolvedValueOnce({ json: async () => [] })         // initial meal-plan
      .mockResolvedValueOnce({ json: async () => mockRecipes }) // recipes
      .mockResolvedValueOnce({ json: async () => newEntry })   // POST response
      .mockResolvedValueOnce({ json: async () => [newEntry] }); // revalidation

    renderPage();
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));

    await userEvent.type(screen.getByPlaceholderText("Search recipes…"), "Pasta");
    await userEvent.click(screen.getByText("Pasta"));
    await userEvent.click(screen.getByRole("button", { name: "Add to Plan" }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/meal-plan",
        expect.objectContaining({ method: "POST" })
      );
    });
  });
});
