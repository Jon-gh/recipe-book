// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RecipesPage from "@/app/recipes/page";

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
  {
    id: "1",
    name: "Pasta Carbonara",
    servings: 4,
    tags: ["Italian"],
    favourite: true,
    ingredients: [{ id: 1 }, { id: 2 }],
  },
  {
    id: "2",
    name: "Thai Beef Stir-Fry",
    servings: 2,
    tags: ["Thai", "quick"],
    favourite: false,
    ingredients: [{ id: 3 }, { id: 4 }, { id: 5 }],
  },
];

beforeEach(() => {
  mockFetch.mockClear();
});

describe("RecipesPage", () => {
  it("shows loading state initially", () => {
    mockFetch.mockResolvedValue({ json: async () => [] });
    render(<RecipesPage />);
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("renders recipe cards after loading", async () => {
    mockFetch.mockResolvedValue({ json: async () => mockRecipes });
    render(<RecipesPage />);

    await waitFor(() => {
      expect(screen.getByText("Pasta Carbonara")).toBeInTheDocument();
      expect(screen.getByText("Thai Beef Stir-Fry")).toBeInTheDocument();
    });
  });

  it("shows empty state when no recipes found", async () => {
    mockFetch.mockResolvedValue({ json: async () => [] });
    render(<RecipesPage />);

    await waitFor(() => {
      expect(screen.getByText("No recipes found.")).toBeInTheDocument();
    });
  });

  it("shows favourite star on favourite recipes", async () => {
    mockFetch.mockResolvedValue({ json: async () => mockRecipes });
    render(<RecipesPage />);

    await waitFor(() => {
      const stars = screen.getAllByText("★");
      expect(stars).toHaveLength(1);
    });
  });

  it("displays serving count and ingredient count", async () => {
    mockFetch.mockResolvedValue({ json: async () => mockRecipes });
    render(<RecipesPage />);

    await waitFor(() => {
      expect(screen.getByText("4 servings")).toBeInTheDocument();
      expect(screen.getByText("2 ingredients")).toBeInTheDocument();
      expect(screen.getByText("2 servings")).toBeInTheDocument();
      expect(screen.getByText("3 ingredients")).toBeInTheDocument();
    });
  });

  it("displays tags as badges", async () => {
    mockFetch.mockResolvedValue({ json: async () => mockRecipes });
    render(<RecipesPage />);

    await waitFor(() => {
      expect(screen.getByText("Italian")).toBeInTheDocument();
      expect(screen.getByText("Thai")).toBeInTheDocument();
      expect(screen.getByText("quick")).toBeInTheDocument();
    });
  });

  it("debounces search and refetches with query param", async () => {
    mockFetch.mockResolvedValue({ json: async () => [] });
    render(<RecipesPage />);

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

    const searchInput = screen.getByPlaceholderText("Search by name, tag or ingredient…");
    await userEvent.type(searchInput, "pasta");

    await waitFor(
      () => {
        const calls = mockFetch.mock.calls;
        const lastCall = calls[calls.length - 1][0] as string;
        expect(lastCall).toContain("q=pasta");
      },
      { timeout: 1000 }
    );
  });

  it("adds favourite=true param when Favourites filter is active", async () => {
    mockFetch.mockResolvedValue({ json: async () => [] });
    render(<RecipesPage />);

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

    await userEvent.click(screen.getByRole("button", { name: "★ Favourites" }));

    await waitFor(() => {
      const calls = mockFetch.mock.calls;
      const lastCall = calls[calls.length - 1][0] as string;
      expect(lastCall).toContain("favourite=true");
    });
  });

  it("toggles favourite filter off when clicked again", async () => {
    mockFetch.mockResolvedValue({ json: async () => [] });
    render(<RecipesPage />);

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

    const favBtn = screen.getByRole("button", { name: "★ Favourites" });
    await userEvent.click(favBtn);
    await userEvent.click(favBtn);

    await waitFor(() => {
      const calls = mockFetch.mock.calls;
      const lastCall = calls[calls.length - 1][0] as string;
      expect(lastCall).not.toContain("favourite=true");
    });
  });
});
