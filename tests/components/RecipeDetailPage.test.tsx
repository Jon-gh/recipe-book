// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
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
  ingredients: [{ id: "i1", name: "eggs", quantity: 3, unit: "", preparation: "", category: "other" }],
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
