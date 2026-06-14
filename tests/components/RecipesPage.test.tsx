// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SWRConfig } from "swr";
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

const mockProduct = (name: string) => ({
  id: 0,
  name,
  category: "other",
  defaultUnit: "",
  defaultQuantity: 1,
  source: "system",
});

const mockRecipes = [
  {
    id: "1",
    name: "Pasta Carbonara",
    servings: 4,
    tags: ["Italian"],
    favourite: true,
    ingredients: [
      { id: 1, product: mockProduct("pasta") },
      { id: 2, product: mockProduct("eggs") },
    ],
  },
  {
    id: "2",
    name: "Thai Beef Stir-Fry",
    servings: 2,
    tags: ["Thai", "quick"],
    favourite: false,
    ingredients: [
      { id: 3, product: mockProduct("beef") },
      { id: 4, product: mockProduct("garlic") },
      { id: 5, product: mockProduct("soy sauce") },
    ],
  },
];

function renderPage() {
  return render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <RecipesPage />
    </SWRConfig>
  );
}

beforeEach(() => {
  mockFetch.mockClear();
});

describe("RecipesPage", () => {
  it("shows loading state initially", () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => [] });
    renderPage();
    expect(screen.getByText("Checking the recipe box…")).toBeInTheDocument();
  });

  it("renders recipe cards after loading", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => mockRecipes });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Pasta Carbonara")).toBeInTheDocument();
      expect(screen.getByText("Thai Beef Stir-Fry")).toBeInTheDocument();
    });
  });

  it("shows empty state when no recipes found", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => [] });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Let's fill this cookbook!")).toBeInTheDocument();
    });
  });

  it("shows favourite star on favourite recipes", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => mockRecipes });
    renderPage();

    await waitFor(() => {
      const stars = screen.getAllByText("★");
      expect(stars).toHaveLength(1);
    });
  });

  it("displays serving count and ingredient count", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => mockRecipes });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("4 servings")).toBeInTheDocument();
      expect(screen.getByText("2 ingredients")).toBeInTheDocument();
      expect(screen.getByText("2 servings")).toBeInTheDocument();
      expect(screen.getByText("3 ingredients")).toBeInTheDocument();
    });
  });

  it("displays tags as badges", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => mockRecipes });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Italian")).toBeInTheDocument();
      expect(screen.getByText("Thai")).toBeInTheDocument();
      expect(screen.getByText("quick")).toBeInTheDocument();
    });
  });

  it("debounces search and refetches with query param", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => [] });
    renderPage();

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
    mockFetch.mockResolvedValue({ ok: true, json: async () => [] });
    renderPage();

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

    await userEvent.click(screen.getByRole("button", { name: "★ Favourites" }));

    await waitFor(() => {
      const calls = mockFetch.mock.calls;
      const lastCall = calls[calls.length - 1][0] as string;
      expect(lastCall).toContain("favourite=true");
    });
  });

  it("shows Cancel button when search input is focused and clears search on click", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => [] });
    renderPage();

    const searchInput = screen.getByPlaceholderText("Search by name, tag or ingredient…");
    await userEvent.click(searchInput);
    await userEvent.type(searchInput, "pasta");

    expect(searchInput).toHaveValue("pasta");

    const cancelBtn = screen.getByRole("button", { name: "Cancel" });
    await userEvent.click(cancelBtn);

    expect(searchInput).toHaveValue("");
  });

  it("shows clear-× button when search has text and clears on click", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => [] });
    renderPage();

    const searchInput = screen.getByPlaceholderText("Search by name, tag or ingredient…");
    await userEvent.type(searchInput, "pasta");

    const clearBtn = screen.getByRole("button", { name: "Clear search" });
    expect(clearBtn).toBeInTheDocument();
    await userEvent.click(clearBtn);

    expect(searchInput).toHaveValue("");
    expect(screen.queryByRole("button", { name: "Clear search" })).not.toBeInTheDocument();
  });

  it("shows discard ActionSheet when closing a dirty recipe form", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => [] });
    renderPage();

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());

    await userEvent.click(screen.getByRole("button", { name: "New Recipe" }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getAllByText("New Recipe").length).toBeGreaterThan(0);

    await userEvent.click(within(dialog).getByText("Type manually"));
    await userEvent.type(within(dialog).getByLabelText("Name"), "My Recipe");

    // Click the form's Cancel button (scoped to the dialog)
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));

    expect(screen.getByText("Discard changes?")).toBeInTheDocument();
  });

  it("closes the sheet after confirming discard", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => [] });
    renderPage();

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());

    await userEvent.click(screen.getByRole("button", { name: "New Recipe" }));
    const dialog = screen.getByRole("dialog");
    await userEvent.click(within(dialog).getByText("Type manually"));
    await userEvent.type(within(dialog).getByLabelText("Name"), "My Recipe");

    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await userEvent.click(screen.getByRole("button", { name: "Discard changes" }));

    await waitFor(() => {
      expect(screen.queryByText("Discard changes?")).not.toBeInTheDocument();
    });
  });

  it("toggles favourite filter off when clicked again", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => [] });
    renderPage();

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
