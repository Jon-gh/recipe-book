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
  { name: "Pasta", quantity: 400, unit: "g", category: "grains & pulses" },
  { name: "Eggs", quantity: 4, unit: "", category: "dairy & eggs" },
  { name: "Flour", quantity: 0.5, unit: "kg", category: "baking & sweeteners" },
];

const mockShoppingItem = {
  id: 99,
  quantity: 2,
  unit: "pack",
  product: { id: 5, name: "Butter", category: "dairy & eggs", defaultUnit: "", defaultQuantity: 1 },
};

const defaultSession = { id: "session", checkedKeys: [], shoppingMode: false, showStaples: false };

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
    if (url === "/api/shopping-session" && method === "GET") {
      return Promise.resolve({ json: async () => session });
    }
    if (url === "/api/shopping-session" && method === "PUT") {
      return Promise.resolve({ json: async () => session });
    }
    // ingredients autocomplete
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

  it("item count includes both meal plan and shopping list items", async () => {
    setupFetch({ shoppingList: [mockShoppingItem] });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("4 items")).toBeInTheDocument();
    });
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

  it("shows copy to clipboard button", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Copy to clipboard" })).toBeInTheDocument();
    });
  });

  it("shows Copied! after clicking copy", async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Copy to clipboard" })).toBeInTheDocument()
    );
    await userEvent.click(screen.getByRole("button", { name: "Copy to clipboard" }));
    expect(screen.getByRole("button", { name: "Copied!" })).toBeInTheDocument();
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

describe("GroceryListPage — staples", () => {
  it("hides staple items by default and shows toggle", async () => {
    setupFetch({
      groceryList: [
        ...mockMealPlanItems,
        { name: "cumin", quantity: 1, unit: "tsp", category: "spices & herbs" },
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
        { name: "cumin", quantity: 1, unit: "tsp", category: "spices & herbs" },
      ],
    });
    renderPage();
    await waitFor(() => expect(screen.getByText("Pasta")).toBeInTheDocument());
    await userEvent.click(screen.getByText(/Show staples/));
    expect(screen.getByText("cumin")).toBeInTheDocument();
    expect(screen.getByText("Hide staples")).toBeInTheDocument();
  });
});

describe("GroceryListPage — shopping mode", () => {
  it("shows Start Shopping button when meal plan has items", async () => {
    renderPage();
    expect(screen.queryByRole("button", { name: "Start Shopping" })).not.toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Start Shopping" })).toBeInTheDocument();
    });
  });

  it("shows Start Shopping button when only shopping list has items", async () => {
    setupFetch({ groceryList: [], shoppingList: [mockShoppingItem] });
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Start Shopping" })).toBeInTheDocument();
    });
  });

  it("does not show Start Shopping button when both lists are empty", async () => {
    setupFetch({ groceryList: [], shoppingList: [] });
    renderPage();
    await waitFor(() => expect(screen.getByText(/No meal plan items yet/)).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Start Shopping" })).not.toBeInTheDocument();
  });

  it("entering shopping mode shows Done and hides copy button", async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Start Shopping" })).toBeInTheDocument()
    );
    await userEvent.click(screen.getByRole("button", { name: "Start Shopping" }));
    expect(screen.getByRole("button", { name: "Done" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Copy to clipboard" })).not.toBeInTheDocument();
  });

  it("tapping an item moves it to In Trolley with strikethrough", async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Start Shopping" })).toBeInTheDocument()
    );
    await userEvent.click(screen.getByRole("button", { name: "Start Shopping" }));

    await userEvent.click(screen.getByRole("button", { name: /Pasta/ }));

    expect(screen.getByText("In Trolley")).toBeInTheDocument();
    expect(screen.getByText("Pasta").className).toContain("line-through");
  });

  it("tapping a checked item unchecks it and removes In Trolley section", async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Start Shopping" })).toBeInTheDocument()
    );
    await userEvent.click(screen.getByRole("button", { name: "Start Shopping" }));

    await userEvent.click(screen.getByRole("button", { name: /Pasta/ }));
    expect(screen.getByText("In Trolley")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Pasta/ }));
    expect(screen.queryByText("In Trolley")).not.toBeInTheDocument();
  });

  it("clicking Done exits shopping mode and resets checked items", async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Start Shopping" })).toBeInTheDocument()
    );
    await userEvent.click(screen.getByRole("button", { name: "Start Shopping" }));
    await userEvent.click(screen.getByRole("button", { name: /Pasta/ }));
    expect(screen.getByText("In Trolley")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Done" }));

    expect(screen.getByRole("button", { name: "Start Shopping" })).toBeInTheDocument();
    expect(screen.queryByText("In Trolley")).not.toBeInTheDocument();
  });

  it("clicking Done sends DELETE for checked shopping list items", async () => {
    setupFetch({ shoppingList: [mockShoppingItem] });
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Start Shopping" })).toBeInTheDocument()
    );
    await userEvent.click(screen.getByRole("button", { name: "Start Shopping" }));

    // Check the shopping list item (tap the row, not the × button)
    const butterButtons = screen.getAllByRole("button", { name: /Butter/ });
    await userEvent.click(butterButtons[0]);
    expect(screen.getByText("In Trolley")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Done" }));

    expect(mockFetch).toHaveBeenCalledWith("/api/shopping-list/99", { method: "DELETE" });
  });

  it("clicking Done does not DELETE meal plan items", async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Start Shopping" })).toBeInTheDocument()
    );
    await userEvent.click(screen.getByRole("button", { name: "Start Shopping" }));
    await userEvent.click(screen.getByRole("button", { name: /Pasta/ }));

    await userEvent.click(screen.getByRole("button", { name: "Done" }));

    const deleteCalls = mockFetch.mock.calls.filter(
      (args: unknown[]) =>
        typeof args[0] === "string" &&
        args[0].startsWith("/api/shopping-list/") &&
        (args[1] as RequestInit)?.method === "DELETE"
    );
    expect(deleteCalls).toHaveLength(0);
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

describe("GroceryListPage — server session persistence", () => {
  it("restores shopping mode from server session", async () => {
    setupFetch({ session: { id: "session", checkedKeys: [], shoppingMode: true, showStaples: false } });
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Done" })).toBeInTheDocument()
    );
  });

  it("sends PUT to server when Start Shopping is clicked", async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Start Shopping" })).toBeInTheDocument()
    );
    await userEvent.click(screen.getByRole("button", { name: "Start Shopping" }));
    await waitFor(
      () =>
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/shopping-session",
          expect.objectContaining({ method: "PUT" })
        ),
      { timeout: 2000 }
    );
  });

  it("sends PUT with shoppingMode false when Done is clicked", async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Start Shopping" })).toBeInTheDocument()
    );
    await userEvent.click(screen.getByRole("button", { name: "Start Shopping" }));
    await userEvent.click(screen.getByRole("button", { name: "Done" }));

    await waitFor(
      () => {
        const putCalls = mockFetch.mock.calls.filter(
          (args: unknown[]) =>
            args[0] === "/api/shopping-session" &&
            (args[1] as RequestInit)?.method === "PUT"
        );
        expect(putCalls.length).toBeGreaterThan(0);
        const lastBody = JSON.parse(putCalls[putCalls.length - 1][1].body as string);
        expect(lastBody.shoppingMode).toBe(false);
        expect(lastBody.checkedKeys).toEqual([]);
      },
      { timeout: 2000 }
    );
  });
});
