// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StartNewWeekWizard from "@/components/StartNewWeekWizard";
import { MealPlanEntry, Recipe } from "@/types";

const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockRecipe: Recipe = {
  id: "r1",
  name: "Pasta Bolognese",
  servings: 4,
  instructions: "Cook.",
  tags: ["Italian"],
  favourite: false,
  notes: "",
  nativeLocale: "en",
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
  ingredients: [
    {
      id: 1,
      quantity: 400,
      unit: "g",
      preparation: "",
      productId: 1,
      recipeId: "r1",
      product: { id: 1, name: "tomatoes", category: "produce", defaultUnit: "g", defaultQuantity: 1, source: "system" },
    },
  ],
};

const mockEntry: MealPlanEntry = {
  id: 1,
  targetServings: 4,
  recipeId: "r1",
  recipe: mockRecipe,
  scheduledMeals: [],
};

const defaultProps = {
  open: true,
  entries: [mockEntry],
  recipes: [mockRecipe],
  checkedKeys: new Set<string>(),
  onClose: vi.fn(),
};

function clickNext(user: ReturnType<typeof userEvent.setup>) {
  return user.click(screen.getByTestId("wizard-next"));
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockResolvedValue({ ok: true, json: async () => ({ entries: [] }) });
});

describe("StartNewWeekWizard", () => {
  it("renders nothing when open=false", () => {
    const { container } = render(<StartNewWeekWizard {...defaultProps} open={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders step 1 when opened", () => {
    render(<StartNewWeekWizard {...defaultProps} />);
    expect(screen.getByText("What did you eat?")).toBeInTheDocument();
    expect(screen.getByTestId("wizard-next")).toBeInTheDocument();
  });

  it("shows current entry in step 1 with default fully consumed", () => {
    render(<StartNewWeekWizard {...defaultProps} />);
    expect(screen.getByText("Pasta Bolognese")).toBeInTheDocument();
    expect(screen.getByText("4 portions total")).toBeInTheDocument();
    expect(screen.getByText(/fully consumed/)).toBeInTheDocument();
  });

  it("step 1 recipe cards show food emoji", () => {
    render(<StartNewWeekWizard {...defaultProps} />);
    // Pasta Bolognese → 🍝
    expect(screen.getByText("🍝")).toBeInTheDocument();
  });

  it("advances to step 2 when Next is clicked", async () => {
    const user = userEvent.setup();
    render(<StartNewWeekWizard {...defaultProps} />);
    await clickNext(user);
    expect(screen.getByText("New week dates")).toBeInTheDocument();
    // Step 2 shows week chip navigation arrows
    expect(screen.getByRole("button", { name: "Previous week" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next week" })).toBeInTheDocument();
  });

  it("can navigate back from step 2 to step 1", async () => {
    const user = userEvent.setup();
    render(<StartNewWeekWizard {...defaultProps} />);
    await clickNext(user);
    await user.click(screen.getByRole("button", { name: /Back/ }));
    expect(screen.getByText("What did you eat?")).toBeInTheDocument();
  });

  it("step 3 shows global lunch/dinner steppers", async () => {
    const user = userEvent.setup();
    render(<StartNewWeekWizard {...defaultProps} />);
    // step 1 → 2 → 3
    await clickNext(user);
    await clickNext(user);
    await waitFor(() => expect(screen.getByText("Portions per meal")).toBeInTheDocument());
    expect(screen.getAllByText("Lunch").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Dinner").length).toBeGreaterThan(0);
  });

  it("shows portion tally in step 4", async () => {
    const user = userEvent.setup();
    render(<StartNewWeekWizard {...defaultProps} />);
    // step 1 → 2 → 3 → 4
    await clickNext(user);
    await clickNext(user);
    await clickNext(user);
    await waitFor(() => expect(screen.getByText("Add recipes")).toBeInTheDocument());
  });

  it("shows step 5 schedule grid before confirm", async () => {
    const user = userEvent.setup();
    render(<StartNewWeekWizard {...defaultProps} entries={[]} />);
    // Steps 1 → 2 → 3 → 4 → 5
    for (let i = 0; i < 4; i++) {
      await clickNext(user);
    }
    expect(screen.getByText("Schedule meals")).toBeInTheDocument();
  });

  it("step 5 shows ☀️ and 🌙 emoji labels on meal slots", async () => {
    const user = userEvent.setup();
    render(<StartNewWeekWizard {...defaultProps} entries={[]} />);
    // Steps 1 → 2 → 3 → 4 → 5
    for (let i = 0; i < 4; i++) {
      await clickNext(user);
    }
    await waitFor(() => expect(screen.getByText("Schedule meals")).toBeInTheDocument());
    expect(screen.getAllByText("☀️").length).toBeGreaterThan(0);
    expect(screen.getAllByText("🌙").length).toBeGreaterThan(0);
  });

  it("shows confirm summary on step 6", async () => {
    const user = userEvent.setup();
    render(<StartNewWeekWizard {...defaultProps} entries={[]} />);
    // Steps 1 → 2 → 3 → 4 → 5 → 6
    for (let i = 0; i < 5; i++) {
      await clickNext(user);
    }
    expect(screen.getByText("Ready to start")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start Week" })).toBeInTheDocument();
  });

  it("calls fetch with correct payload and invokes onClose when Start Week is clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<StartNewWeekWizard {...defaultProps} entries={[]} onClose={onClose} />);
    for (let i = 0; i < 5; i++) {
      await clickNext(user);
    }
    await user.click(screen.getByRole("button", { name: "Start Week" }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/meal-plan/new-week",
        expect.objectContaining({ method: "POST" })
      );
    });

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledWith(
        expect.objectContaining({ weekStart: expect.any(String), weekEnd: expect.any(String) })
      );
    });
  });

  it("shows error message when API call fails", async () => {
    mockFetch.mockResolvedValue({ ok: false, json: async () => ({ error: "DB error" }) });
    const user = userEvent.setup();
    render(<StartNewWeekWizard {...defaultProps} entries={[]} />);
    for (let i = 0; i < 5; i++) {
      await clickNext(user);
    }
    await user.click(screen.getByRole("button", { name: "Start Week" }));
    await waitFor(() => {
      expect(screen.getByText("DB error")).toBeInTheDocument();
    });
  });

  it("creates ShoppingListItems for already-bought ingredients when adding new recipes", async () => {
    const checkedKeys = new Set(["tomatoes__g"]);
    const user = userEvent.setup();
    render(
      <StartNewWeekWizard
        {...defaultProps}
        entries={[]}
        checkedKeys={checkedKeys}
      />
    );

    // Navigate to step 4 (3 clicks: 1→2, 2→3, 3→4)
    for (let i = 0; i < 3; i++) {
      await clickNext(user);
    }

    // Add mockRecipe
    const searchInput = screen.getByPlaceholderText("Search recipes to add…");
    await user.click(searchInput);
    await user.type(searchInput, "Pasta");
    await user.click(screen.getByText("Pasta Bolognese"));
    await user.click(screen.getByRole("button", { name: "Add" }));

    // Advance through step 5 (schedule) and step 6 (confirm), then start week
    await clickNext(user);
    await clickNext(user);
    await user.click(screen.getByRole("button", { name: "Start Week" }));

    // Should call shopping-list API for the already-bought "tomatoes__g" ingredient
    await waitFor(() => {
      const shoppingListCalls = mockFetch.mock.calls.filter(
        (call) => call[0] === "/api/shopping-list"
      );
      expect(shoppingListCalls.length).toBeGreaterThan(0);
      const body = JSON.parse(shoppingListCalls[0][1].body);
      expect(body.name).toBe("tomatoes");
    });
  });
});
