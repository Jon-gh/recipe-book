// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GroceryListPage from "@/app/grocery-list/page";

const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockItems = [
  { name: "Pasta", quantity: 400, unit: "g", category: "grains & pulses" },
  { name: "Eggs", quantity: 4, unit: "", category: "dairy & eggs" },
  { name: "Flour", quantity: 0.5, unit: "kg", category: "baking & sweeteners" },
];

beforeEach(() => {
  mockFetch.mockClear();
  mockRefresh.mockClear();
  localStorage.clear();
});

describe("GroceryListPage", () => {
  it("shows loading state initially", () => {
    mockFetch.mockResolvedValue({ json: async () => [] });
    render(<GroceryListPage />);
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("shows empty state when no items", async () => {
    mockFetch.mockResolvedValue({ json: async () => [] });
    render(<GroceryListPage />);
    await waitFor(() => {
      expect(screen.getByText(/No items yet/)).toBeInTheDocument();
    });
  });

  it("renders grocery items after loading", async () => {
    mockFetch.mockResolvedValue({ json: async () => mockItems });
    render(<GroceryListPage />);
    await waitFor(() => {
      expect(screen.getByText("Pasta")).toBeInTheDocument();
      expect(screen.getByText("Eggs")).toBeInTheDocument();
      expect(screen.getByText("Flour")).toBeInTheDocument();
    });
  });

  it("calls router.refresh() on mount to invalidate router cache", async () => {
    mockFetch.mockResolvedValue({ json: async () => mockItems });
    render(<GroceryListPage />);
    await waitFor(() => expect(screen.getByText("Pasta")).toBeInTheDocument());
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("fetches with cache: no-store to always get fresh data", async () => {
    mockFetch.mockResolvedValue({ json: async () => mockItems });
    render(<GroceryListPage />);
    await waitFor(() => expect(screen.getByText("Pasta")).toBeInTheDocument());
    expect(mockFetch).toHaveBeenCalledWith("/api/grocery-list", { cache: "no-store" });
  });

  it("shows item count", async () => {
    mockFetch.mockResolvedValue({ json: async () => mockItems });
    render(<GroceryListPage />);
    await waitFor(() => {
      expect(screen.getByText("3 items")).toBeInTheDocument();
    });
  });

  it("shows quantity with unit", async () => {
    mockFetch.mockResolvedValue({ json: async () => mockItems });
    render(<GroceryListPage />);
    await waitFor(() => {
      expect(screen.getByText("400 g")).toBeInTheDocument();
    });
  });

  it("shows decimal quantity for fractional amounts", async () => {
    mockFetch.mockResolvedValue({ json: async () => mockItems });
    render(<GroceryListPage />);
    await waitFor(() => {
      expect(screen.getByText("0.5 kg")).toBeInTheDocument();
    });
  });

  it("shows copy to clipboard button", async () => {
    mockFetch.mockResolvedValue({ json: async () => mockItems });
    render(<GroceryListPage />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Copy to clipboard" })).toBeInTheDocument();
    });
  });

  it("shows download button", async () => {
    mockFetch.mockResolvedValue({ json: async () => mockItems });
    render(<GroceryListPage />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Download .txt" })).toBeInTheDocument();
    });
  });

  it("shows Copied! after clicking copy", async () => {
    mockFetch.mockResolvedValue({ json: async () => mockItems });
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });

    render(<GroceryListPage />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Copy to clipboard" })).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "Copy to clipboard" }));
    expect(screen.getByRole("button", { name: "Copied!" })).toBeInTheDocument();
  });

  it("groups items by category", async () => {
    mockFetch.mockResolvedValue({ json: async () => mockItems });
    render(<GroceryListPage />);
    await waitFor(() => {
      expect(screen.getByText("grains & pulses")).toBeInTheDocument();
      expect(screen.getByText("dairy & eggs")).toBeInTheDocument();
    });
  });
});

describe("GroceryListPage — staples", () => {
  it("hides staple items by default and shows toggle", async () => {
    const itemsWithStaple = [
      ...mockItems,
      { name: "cumin", quantity: 1, unit: "tsp", category: "spices & herbs" },
    ];
    mockFetch.mockResolvedValue({ json: async () => itemsWithStaple });
    render(<GroceryListPage />);
    await waitFor(() => expect(screen.getByText("Pasta")).toBeInTheDocument());
    expect(screen.queryByText("cumin")).not.toBeInTheDocument();
    expect(screen.getByText(/Show staples/)).toBeInTheDocument();
  });

  it("shows staple items after clicking Show staples", async () => {
    const itemsWithStaple = [
      ...mockItems,
      { name: "cumin", quantity: 1, unit: "tsp", category: "spices & herbs" },
    ];
    mockFetch.mockResolvedValue({ json: async () => itemsWithStaple });
    render(<GroceryListPage />);
    await waitFor(() => expect(screen.getByText("Pasta")).toBeInTheDocument());
    await userEvent.click(screen.getByText(/Show staples/));
    expect(screen.getByText("cumin")).toBeInTheDocument();
    expect(screen.getByText("Hide staples")).toBeInTheDocument();
  });
});

describe("GroceryListPage — shopping mode", () => {
  it("shows Start Shopping button when items are loaded, not while loading or empty", async () => {
    mockFetch.mockResolvedValue({ json: async () => mockItems });
    render(<GroceryListPage />);
    expect(screen.queryByRole("button", { name: "Start Shopping" })).not.toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Start Shopping" })).toBeInTheDocument();
    });
  });

  it("does not show Start Shopping button when list is empty", async () => {
    mockFetch.mockResolvedValue({ json: async () => [] });
    render(<GroceryListPage />);
    await waitFor(() => expect(screen.getByText(/No items yet/)).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Start Shopping" })).not.toBeInTheDocument();
  });

  it("entering shopping mode shows Done and hides copy/download buttons", async () => {
    mockFetch.mockResolvedValue({ json: async () => mockItems });
    render(<GroceryListPage />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Start Shopping" })).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Start Shopping" }));
    expect(screen.getByRole("button", { name: "Done" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Copy to clipboard" })).not.toBeInTheDocument();
  });

  it("tapping an item moves it to In Trolley with strikethrough", async () => {
    mockFetch.mockResolvedValue({ json: async () => mockItems });
    render(<GroceryListPage />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Start Shopping" })).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Start Shopping" }));

    await userEvent.click(screen.getByRole("button", { name: /Pasta/ }));

    expect(screen.getByText("In Trolley")).toBeInTheDocument();
    expect(screen.getByText("Pasta").className).toContain("line-through");
  });

  it("tapping a checked item unchecks it and removes In Trolley section", async () => {
    mockFetch.mockResolvedValue({ json: async () => mockItems });
    render(<GroceryListPage />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Start Shopping" })).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Start Shopping" }));

    await userEvent.click(screen.getByRole("button", { name: /Pasta/ }));
    expect(screen.getByText("In Trolley")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Pasta/ }));
    expect(screen.queryByText("In Trolley")).not.toBeInTheDocument();
  });

  it("clicking Done exits shopping mode and resets checked items", async () => {
    mockFetch.mockResolvedValue({ json: async () => mockItems });
    render(<GroceryListPage />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Start Shopping" })).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Start Shopping" }));
    await userEvent.click(screen.getByRole("button", { name: /Pasta/ }));
    expect(screen.getByText("In Trolley")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Done" }));

    expect(screen.getByRole("button", { name: "Start Shopping" })).toBeInTheDocument();
    expect(screen.queryByText("In Trolley")).not.toBeInTheDocument();
  });
});

describe("GroceryListPage — add custom items", () => {
  it("shows Add item input in shopping mode", async () => {
    mockFetch.mockResolvedValue({ json: async () => mockItems });
    render(<GroceryListPage />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Start Shopping" })).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Start Shopping" }));
    expect(screen.getByPlaceholderText("Add item…")).toBeInTheDocument();
  });

  it("adds a custom item when clicking +", async () => {
    mockFetch.mockResolvedValue({ json: async () => mockItems });
    render(<GroceryListPage />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Start Shopping" })).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Start Shopping" }));

    await userEvent.type(screen.getByPlaceholderText("Add item…"), "Butter");
    await userEvent.click(screen.getByRole("button", { name: "+" }));

    expect(screen.getByText("Butter")).toBeInTheDocument();
  });

  it("adds a custom item when pressing Enter", async () => {
    mockFetch.mockResolvedValue({ json: async () => mockItems });
    render(<GroceryListPage />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Start Shopping" })).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Start Shopping" }));

    await userEvent.type(screen.getByPlaceholderText("Add item…"), "Butter{Enter}");

    expect(screen.getByText("Butter")).toBeInTheDocument();
  });

  it("clears input after adding item", async () => {
    mockFetch.mockResolvedValue({ json: async () => mockItems });
    render(<GroceryListPage />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Start Shopping" })).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Start Shopping" }));

    await userEvent.type(screen.getByPlaceholderText("Add item…"), "Butter{Enter}");

    expect(screen.getByPlaceholderText("Add item…")).toHaveValue("");
  });

  it("custom items are cleared when Done is clicked", async () => {
    mockFetch.mockResolvedValue({ json: async () => mockItems });
    render(<GroceryListPage />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Start Shopping" })).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Start Shopping" }));
    await userEvent.type(screen.getByPlaceholderText("Add item…"), "Butter{Enter}");
    expect(screen.getByText("Butter")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Done" }));

    expect(screen.queryByText("Butter")).not.toBeInTheDocument();
  });
});

describe("GroceryListPage — localStorage persistence", () => {
  it("restores shopping mode from localStorage", async () => {
    const saved = {
      checkedKeys: [],
      customItems: [],
      shoppingMode: true,
      showStaples: false,
    };
    localStorage.setItem("recipe-book:shopping", JSON.stringify(saved));

    mockFetch.mockResolvedValue({ json: async () => mockItems });
    render(<GroceryListPage />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Done" })).toBeInTheDocument());
  });

  it("restores custom items from localStorage", async () => {
    const saved = {
      checkedKeys: [],
      customItems: [{ name: "Butter", quantity: 1, unit: "", category: "other" }],
      shoppingMode: true,
      showStaples: false,
    };
    localStorage.setItem("recipe-book:shopping", JSON.stringify(saved));

    mockFetch.mockResolvedValue({ json: async () => mockItems });
    render(<GroceryListPage />);
    await waitFor(() => expect(screen.getByText("Butter")).toBeInTheDocument());
  });

  it("clears localStorage when Done is clicked", async () => {
    mockFetch.mockResolvedValue({ json: async () => mockItems });
    render(<GroceryListPage />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Start Shopping" })).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Start Shopping" }));
    await userEvent.click(screen.getByRole("button", { name: "Done" }));

    expect(localStorage.getItem("recipe-book:shopping")).toBeNull();
  });
});

describe("GroceryListPage — shopping mode", () => {
  it("shows Start Shopping button when items are loaded, not while loading or empty", async () => {
    mockFetch.mockResolvedValue({ json: async () => mockItems });
    render(<GroceryListPage />);
    // Not visible while loading
    expect(screen.queryByRole("button", { name: "Start Shopping" })).not.toBeInTheDocument();
    // Visible after load
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Start Shopping" })).toBeInTheDocument();
    });
  });

  it("does not show Start Shopping button when list is empty", async () => {
    mockFetch.mockResolvedValue({ json: async () => [] });
    render(<GroceryListPage />);
    await waitFor(() => expect(screen.getByText(/No items yet/)).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Start Shopping" })).not.toBeInTheDocument();
  });

  it("entering shopping mode shows Done and hides copy/download buttons", async () => {
    mockFetch.mockResolvedValue({ json: async () => mockItems });
    render(<GroceryListPage />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Start Shopping" })).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Start Shopping" }));
    expect(screen.getByRole("button", { name: "Done" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Copy to clipboard" })).not.toBeInTheDocument();
  });

  it("tapping an item moves it to In Trolley with strikethrough", async () => {
    mockFetch.mockResolvedValue({ json: async () => mockItems });
    render(<GroceryListPage />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Start Shopping" })).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Start Shopping" }));

    await userEvent.click(screen.getByRole("button", { name: /Pasta/ }));

    expect(screen.getByText("In Trolley")).toBeInTheDocument();
    expect(screen.getByText("Pasta").className).toContain("line-through");
  });

  it("tapping a checked item unchecks it and removes In Trolley section", async () => {
    mockFetch.mockResolvedValue({ json: async () => mockItems });
    render(<GroceryListPage />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Start Shopping" })).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Start Shopping" }));

    await userEvent.click(screen.getByRole("button", { name: /Pasta/ }));
    expect(screen.getByText("In Trolley")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Pasta/ }));
    expect(screen.queryByText("In Trolley")).not.toBeInTheDocument();
  });

  it("clicking Done exits shopping mode and resets checked items", async () => {
    mockFetch.mockResolvedValue({ json: async () => mockItems });
    render(<GroceryListPage />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Start Shopping" })).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Start Shopping" }));
    await userEvent.click(screen.getByRole("button", { name: /Pasta/ }));
    expect(screen.getByText("In Trolley")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Done" }));

    expect(screen.getByRole("button", { name: "Start Shopping" })).toBeInTheDocument();
    expect(screen.queryByText("In Trolley")).not.toBeInTheDocument();
  });
});
