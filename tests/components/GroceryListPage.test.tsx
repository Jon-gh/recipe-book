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

const mockMealPlanItems = [
  { name: "Pasta", quantity: 400, unit: "g", category: "grains & pulses", productId: 1, source: "system" },
  { name: "Eggs", quantity: 4, unit: "", category: "dairy & eggs", productId: 2, source: "system" },
  { name: "Flour", quantity: 0.5, unit: "kg", category: "baking & sweeteners", productId: 3, source: "system" },
];

const mockShoppingItem = {
  id: 99,
  quantity: 2,
  unit: "pack",
  product: { id: 5, name: "Butter", category: "dairy & eggs", defaultUnit: "", defaultQuantity: 1, source: "user" },
};

const defaultSession = { id: "session", checkedKeys: [], showStaples: false };

function setupFetch({
  groceryList = mockMealPlanItems,
  shoppingList = [] as object[],
  session = defaultSession as object,
} = {}) {
  mockFetch.mockImplementation((url: string, options?: RequestInit) => {
    const method = (options?.method ?? "GET").toUpperCase();
    if (url === "/api/grocery-list") {
      return Promise.resolve({ json: async () => groceryList });
    }
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
    if (url === "/api/shopping-session" && method === "GET") {
      return Promise.resolve({ json: async () => session });
    }
    if (url === "/api/shopping-session" && method === "PUT") {
      return Promise.resolve({ json: async () => session });
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
  localStorage.clear();
  setupFetch();
});

describe("GroceryListPage", () => {
  it("shows loading state initially", () => {
    renderPage();
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("shows empty state when no items in either list", async () => {
    setupFetch({ groceryList: [], shoppingList: [] });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/No meal plan items yet/)).toBeInTheDocument();
    });
  });

  it("renders meal plan items after loading", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Pasta")).toBeInTheDocument();
      expect(screen.getByText("Eggs")).toBeInTheDocument();
      expect(screen.getByText("Flour")).toBeInTheDocument();
    });
  });

  it("renders shopping list items with a remove button", async () => {
    setupFetch({ shoppingList: [mockShoppingItem] });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Butter")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Remove Butter" })).toBeInTheDocument();
  });

  it("meal plan items do not have a remove button", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Pasta")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Remove Pasta" })).not.toBeInTheDocument();
  });

  it("fetches grocery-list with cache: no-store", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Pasta")).toBeInTheDocument());
    expect(mockFetch).toHaveBeenCalledWith("/api/grocery-list", { cache: "no-store" });
  });

  it("shows quantity with unit", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("400 g")).toBeInTheDocument();
    });
  });

  it("shows decimal quantity for fractional amounts", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("0.5 kg")).toBeInTheDocument();
    });
  });

  it("groups items by category", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("grains & pulses")).toBeInTheDocument();
      expect(screen.getByText("dairy & eggs")).toBeInTheDocument();
    });
  });
});

describe("GroceryListPage — remove shopping list item", () => {
  it("calls DELETE when × is clicked on a shopping list item", async () => {
    setupFetch({ shoppingList: [mockShoppingItem] });
    renderPage();
    await waitFor(() => expect(screen.getByText("Butter")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "Remove Butter" }));

    expect(mockFetch).toHaveBeenCalledWith("/api/shopping-list/99", { method: "DELETE" });
  });
});

describe("GroceryListPage — shopping list undo", () => {
  it("tapping Undo dismisses the toast without deleting", async () => {
    setupFetch({ shoppingList: [mockShoppingItem] });
    renderPage();
    await waitFor(() => expect(screen.getByText("Butter")).toBeInTheDocument());

    await userEvent.click(screen.getAllByRole("button", { name: /Butter/ })[0]);
    await waitFor(() => expect(screen.getByRole("button", { name: "Undo" })).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "Undo" }));

    await waitFor(() => expect(screen.queryByRole("button", { name: "Undo" })).not.toBeInTheDocument());
    expect(mockFetch).not.toHaveBeenCalledWith("/api/shopping-list/99", { method: "DELETE" });
  });

  it("DELETE is called immediately when the component unmounts with a pending delete", async () => {
    setupFetch({ shoppingList: [mockShoppingItem] });
    const { unmount } = renderPage();
    await waitFor(() => expect(screen.getByText("Butter")).toBeInTheDocument());

    await userEvent.click(screen.getAllByRole("button", { name: /Butter/ })[0]);
    await waitFor(() => expect(screen.getByText("Butter removed")).toBeInTheDocument());

    unmount();

    expect(mockFetch).toHaveBeenCalledWith("/api/shopping-list/99", { method: "DELETE" });
  });

  it("DELETE is called after the undo window expires", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    setupFetch({ shoppingList: [mockShoppingItem] });
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
});

describe("GroceryListPage — staples", () => {
  it("hides staple items by default and shows toggle", async () => {
    setupFetch({
      groceryList: [
        ...mockMealPlanItems,
        { name: "cumin", quantity: 1, unit: "tsp", category: "spices & herbs", productId: 10, source: "system" },
      ],
    });
    renderPage();
    await waitFor(() => expect(screen.getByText("Pasta")).toBeInTheDocument());
    expect(screen.queryByText("cumin")).not.toBeInTheDocument();
    expect(screen.getByText(/Show staples/)).toBeInTheDocument();
  });

  it("shows staple items after clicking Show staples", async () => {
    setupFetch({
      groceryList: [
        ...mockMealPlanItems,
        { name: "cumin", quantity: 1, unit: "tsp", category: "spices & herbs", productId: 10, source: "system" },
      ],
    });
    renderPage();
    await waitFor(() => expect(screen.getByText("Pasta")).toBeInTheDocument());
    await userEvent.click(screen.getByText(/Show staples/));
    expect(screen.getByText("cumin")).toBeInTheDocument();
    expect(screen.getByText("Hide staples")).toBeInTheDocument();
  });

  it("always shows manually added shopping list items even if their category is a staple", async () => {
    const ketchupShoppingItem = {
      id: 42,
      quantity: 1,
      unit: "bottle",
      product: { id: 10, name: "Ketchup", category: "condiments & sauces", defaultUnit: "", defaultQuantity: 1, source: "user" },
    };
    setupFetch({
      groceryList: [
        ...mockMealPlanItems,
        { name: "cumin", quantity: 1, unit: "tsp", category: "condiments & sauces", productId: 11, source: "system" },
      ],
      shoppingList: [ketchupShoppingItem],
    });
    renderPage();
    await waitFor(() => expect(screen.getByText("Pasta")).toBeInTheDocument());
    // Manually added Ketchup is visible even though staples are hidden
    expect(screen.getByText("Ketchup")).toBeInTheDocument();
    // Meal-plan item in the same staple category remains hidden
    expect(screen.queryByText("cumin")).not.toBeInTheDocument();
    // Only the meal-plan staple item counts toward the toggle
    expect(screen.getByText("Show staples (1)")).toBeInTheDocument();
  });
});

describe("GroceryListPage — checking items", () => {
  it("does not show Start Shopping button — items are always checkable", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Pasta")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Start Shopping" })).not.toBeInTheDocument();
  });

  it("tapping an item moves it to In Trolley with strikethrough", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Pasta")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: /Pasta/ }));

    expect(screen.getByText("In Trolley")).toBeInTheDocument();
    expect(screen.getByText("Pasta").className).toContain("line-through");
  });

  it("tapping a checked item unchecks it and removes In Trolley section", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Pasta")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: /Pasta/ }));
    expect(screen.getByText("In Trolley")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Pasta/ }));
    expect(screen.queryByText("In Trolley")).not.toBeInTheDocument();
  });

  it("tapping a shopping list item optimistically removes it and shows undo toast", async () => {
    setupFetch({ shoppingList: [mockShoppingItem] });
    renderPage();
    await waitFor(() => expect(screen.getByText("Butter")).toBeInTheDocument());

    await userEvent.click(screen.getAllByRole("button", { name: /Butter/ })[0]);

    await waitFor(() => expect(screen.getByText("Butter removed")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Undo" })).toBeInTheDocument();
    // DELETE not called immediately
    expect(mockFetch).not.toHaveBeenCalledWith("/api/shopping-list/99", { method: "DELETE" });
    // Does not move to In Trolley
    expect(screen.queryByText("In Trolley")).not.toBeInTheDocument();
  });

});

describe("GroceryListPage — server session persistence", () => {
  it("restores checked keys from server session", async () => {
    setupFetch({ session: { id: "session", checkedKeys: ["pasta__g"], showStaples: false } });
    renderPage();
    await waitFor(() => expect(screen.getByText("In Trolley")).toBeInTheDocument());
  });

  it("sends PUT to server when an item is checked", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Pasta")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: /Pasta/ }));

    await waitFor(
      () =>
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/shopping-session",
          expect.objectContaining({ method: "PUT" })
        ),
      { timeout: 2000 }
    );
  });

});

describe("GroceryListPage — add to shopping list", () => {
  it("shows FAB add button", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Pasta")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Add to shopping list" })).toBeInTheDocument();
  });

  it("opens add sheet when FAB is clicked", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Pasta")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "Add to shopping list" }));

    await waitFor(() =>
      expect(screen.getByPlaceholderText("e.g. butter, oat milk…")).toBeInTheDocument()
    );
  });

  it("POSTs new item with name, quantity, unit and category when clicking Add to List", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Pasta")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "Add to shopping list" }));
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
  });

  it("POSTs new item when pressing Enter in the name field", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Pasta")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "Add to shopping list" }));
    await waitFor(() =>
      expect(screen.getByPlaceholderText("e.g. butter, oat milk…")).toBeInTheDocument()
    );

    await userEvent.type(
      screen.getByPlaceholderText("e.g. butter, oat milk…"),
      "Butter{Enter}"
    );

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/shopping-list",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("closes sheet after adding item", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Pasta")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "Add to shopping list" }));
    await waitFor(() =>
      expect(screen.getByPlaceholderText("e.g. butter, oat milk…")).toBeInTheDocument()
    );

    await userEvent.type(screen.getByPlaceholderText("e.g. butter, oat milk…"), "Butter");
    await userEvent.click(screen.getByRole("button", { name: "Add to List" }));

    await waitFor(() =>
      expect(screen.queryByPlaceholderText("e.g. butter, oat milk…")).not.toBeInTheDocument()
    );
  });

  it("Add to List button is disabled when name is empty", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Pasta")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "Add to shopping list" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Add to List" })).toBeInTheDocument()
    );

    expect(screen.getByRole("button", { name: "Add to List" })).toBeDisabled();
  });
});
