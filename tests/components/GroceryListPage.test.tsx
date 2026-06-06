// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SWRConfig } from "swr";
import GroceryListPage from "@/app/grocery-list/page";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockShoppingItems = [
  {
    id: 1,
    quantity: 400,
    unit: "g",
    product: { id: 1, name: "Pasta", category: "grains & pulses", defaultUnit: "g", defaultQuantity: 1, source: "system" },
  },
  {
    id: 2,
    quantity: 4,
    unit: "",
    product: { id: 2, name: "Eggs", category: "dairy & eggs", defaultUnit: "", defaultQuantity: 1, source: "system" },
  },
  {
    id: 3,
    quantity: 500,
    unit: "g",
    product: { id: 3, name: "Flour", category: "baking & sweeteners", defaultUnit: "g", defaultQuantity: 1, source: "system" },
  },
];

const mockUserShoppingItem = {
  id: 99,
  quantity: 2,
  unit: "pack",
  product: { id: 5, name: "Butter", category: "dairy & eggs", defaultUnit: "", defaultQuantity: 1, source: "user" },
};

function setupFetch({ shoppingList = mockShoppingItems as object[] } = {}) {
  mockFetch.mockImplementation((url: string, options?: RequestInit) => {
    const method = (options?.method ?? "GET").toUpperCase();
    if (url === "/api/shopping-list" && method === "GET") {
      return Promise.resolve({ json: async () => shoppingList });
    }
    if (url === "/api/shopping-list" && method === "POST") {
      return Promise.resolve({ status: 201, json: async () => ({}) });
    }
    if (/\/api\/shopping-list\/\d+/.test(url) && method === "DELETE") {
      return Promise.resolve({ status: 204 });
    }
    if (/\/api\/products\/\d+/.test(url) && method === "PUT") {
      return Promise.resolve({ json: async () => ({}) });
    }
    return Promise.resolve({ json: async () => [] });
  });
}

function renderPage() {
  return render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <GroceryListPage />
    </SWRConfig>
  );
}

beforeEach(() => {
  mockFetch.mockClear();
  setupFetch();
});

describe("GroceryListPage", () => {
  it("shows loading state initially", () => {
    renderPage();
    expect(screen.getByText("Gathering your ingredients…")).toBeInTheDocument();
  });

  it("shows empty state when shopping list is empty", async () => {
    setupFetch({ shoppingList: [] });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Your trolley is empty.")).toBeInTheDocument();
    });
  });

  it("renders shopping list items after loading", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Pasta")).toBeInTheDocument();
      expect(screen.getByText("Eggs")).toBeInTheDocument();
      expect(screen.getByText("Flour")).toBeInTheDocument();
    });
  });

  it("shows quantity with unit", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("400 g")).toBeInTheDocument();
    });
  });

  it("groups items by category", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Grains & pulses/)).toBeInTheDocument();
      expect(screen.getByText(/Dairy & eggs/)).toBeInTheDocument();
    });
  });

  it("does not fetch /api/grocery-list", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Pasta")).toBeInTheDocument());
    expect(mockFetch).not.toHaveBeenCalledWith("/api/grocery-list", expect.anything());
  });
});

describe("GroceryListPage — tap to remove (uniform behaviour)", () => {
  it("tapping any item shows undo toast immediately", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Pasta")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: /Pasta/ }));

    await waitFor(() => expect(screen.getByText("Pasta removed")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Undo" })).toBeInTheDocument();
  });

  it("tapped item disappears from list optimistically", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Pasta")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: /Pasta/ }));

    expect(screen.queryByText("Pasta")).not.toBeInTheDocument();
    expect(screen.getByText("Eggs")).toBeInTheDocument();
  });

  it("DELETE is not called immediately — only after undo window", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Pasta")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: /Pasta/ }));

    expect(mockFetch).not.toHaveBeenCalledWith("/api/shopping-list/1", { method: "DELETE" });
  });

  it("DELETE is called after the undo window expires", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    setupFetch({ shoppingList: [mockUserShoppingItem] });
    renderPage();
    await waitFor(() => expect(screen.getByText("Butter")).toBeInTheDocument());

    await userEvent.click(screen.getAllByRole("button", { name: /Butter/ })[0]);
    await waitFor(() => expect(screen.getByText("Butter removed")).toBeInTheDocument());

    vi.runAllTimers();
    vi.useRealTimers();

    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith("/api/shopping-list/99", { method: "DELETE" })
    );
  });

  it("tapping Undo cancels the delete", async () => {
    setupFetch({ shoppingList: [mockUserShoppingItem] });
    renderPage();
    await waitFor(() => expect(screen.getByText("Butter")).toBeInTheDocument());

    await userEvent.click(screen.getAllByRole("button", { name: /Butter/ })[0]);
    await waitFor(() => expect(screen.getByRole("button", { name: "Undo" })).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "Undo" }));

    await waitFor(() => expect(screen.queryByRole("button", { name: "Undo" })).not.toBeInTheDocument());
    expect(mockFetch).not.toHaveBeenCalledWith("/api/shopping-list/99", { method: "DELETE" });
  });

  it("DELETE is called immediately when component unmounts with a pending delete", async () => {
    setupFetch({ shoppingList: [mockUserShoppingItem] });
    const { unmount } = renderPage();
    await waitFor(() => expect(screen.getByText("Butter")).toBeInTheDocument());

    await userEvent.click(screen.getAllByRole("button", { name: /Butter/ })[0]);
    await waitFor(() => expect(screen.getByText("Butter removed")).toBeInTheDocument());

    unmount();

    expect(mockFetch).toHaveBeenCalledWith("/api/shopping-list/99", { method: "DELETE" });
  });
});

describe("GroceryListPage — no shopping-session dependency", () => {
  it("does not fetch /api/shopping-session", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Pasta")).toBeInTheDocument());
    expect(mockFetch).not.toHaveBeenCalledWith("/api/shopping-session", expect.anything());
  });

  it("does not show a Start Shopping button or checked-items mode", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Pasta")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Start Shopping" })).not.toBeInTheDocument();
  });
});

describe("GroceryListPage — add to shopping list", () => {
  it("shows FAB add button", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Pasta")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Add to Shopping List" })).toBeInTheDocument();
  });

  it("opens add sheet when FAB is clicked", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Pasta")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "Add to Shopping List" }));

    await waitFor(() =>
      expect(screen.getByPlaceholderText("e.g. butter, oat milk…")).toBeInTheDocument()
    );
  });

  it("POSTs new item and closes sheet", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Pasta")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "Add to Shopping List" }));
    await waitFor(() =>
      expect(screen.getByPlaceholderText("e.g. butter, oat milk…")).toBeInTheDocument()
    );

    await userEvent.type(screen.getByPlaceholderText("e.g. butter, oat milk…"), "Butter");
    await userEvent.click(screen.getByRole("button", { name: "Add to List" }));

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/shopping-list",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "Butter", quantity: 1, unit: "", category: "other" }),
      })
    );

    await waitFor(() =>
      expect(screen.queryByPlaceholderText("e.g. butter, oat milk…")).not.toBeInTheDocument()
    );
  });

  it("Add to List button is disabled when name is empty", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Pasta")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "Add to Shopping List" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Add to List" })).toBeInTheDocument()
    );

    expect(screen.getByRole("button", { name: "Add to List" })).toBeDisabled();
  });
});
