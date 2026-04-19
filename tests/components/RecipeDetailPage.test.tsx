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

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useParams: () => ({ id: "1" }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockRecipe = {
  id: "1",
  name: "Pasta Carbonara",
  servings: 4,
  tags: ["Italian"],
  favourite: false,
  ingredients: [{ id: 1, ingredientId: 1, quantity: 3, unit: "", preparation: "", recipeId: "1", ingredient: { id: 1, name: "eggs", category: "other" } }],
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
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => mockRecipe,
  });
  mockVibrate.mockClear();
});

describe("RecipeDetailPage — favourite toggle", () => {
  it("shows unfilled star when recipe is not a favourite", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Pasta Carbonara")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Add to favourites" })).toBeInTheDocument();
  });

  it("shows filled star when recipe is a favourite", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ ...mockRecipe, favourite: true }),
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
      expect.objectContaining({
        method: "PUT",
        body: expect.stringContaining('"favourite":true'),
      })
    );
  });

  it("calls PUT with favourite:false when toggling off", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ ...mockRecipe, favourite: true }),
    });
    renderPage();
    await waitFor(() => expect(screen.getByText("Pasta Carbonara")).toBeInTheDocument());

    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ ...mockRecipe, favourite: false }) });

    await userEvent.click(screen.getByRole("button", { name: "Remove from favourites" }));

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/recipes/1",
      expect.objectContaining({
        method: "PUT",
        body: expect.stringContaining('"favourite":false'),
      })
    );
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

    await userEvent.click(screen.getByRole("button", { name: /delete/i }));
    const confirmBtn = await screen.findByRole("button", { name: "Delete Recipe" });
    await userEvent.click(confirmBtn);

    expect(mockVibrate).toHaveBeenCalled();
  });

  it("vibrates on add to plan confirmation", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Pasta Carbonara")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: /add to meal plan/i }));

    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
    // Two "Add to Meal Plan" buttons exist when the sheet is open — the page button and the sheet confirm button.
    // The confirm button is the last one rendered.
    const allAddBtns = await screen.findAllByRole("button", { name: "Add to Meal Plan" });
    await userEvent.click(allAddBtns[allAddBtns.length - 1]);

    expect(mockVibrate).toHaveBeenCalled();
  });
});
