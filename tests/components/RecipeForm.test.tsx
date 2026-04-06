// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RecipeForm from "@/components/RecipeForm";

// Mock next/navigation
const mockPush = vi.fn();
const mockBack = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockRecipe = {
  id: "recipe-1",
  name: "Pasta Carbonara",
  servings: 4,
  instructions: "Cook pasta. Mix eggs and cheese. Combine.",
  tags: ["Italian", "quick"],
  favourite: false,
  notes: "Use guanciale if possible.",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
  ingredients: [
    { id: 1, name: "Pasta", quantity: 400, unit: "g", preparation: "", category: "grains & pulses", recipeId: "recipe-1" },
    { id: 2, name: "Eggs", quantity: 4, unit: "", preparation: "beaten", category: "dairy & eggs", recipeId: "recipe-1" },
  ],
};

beforeEach(() => {
  mockPush.mockClear();
  mockBack.mockClear();
  mockFetch.mockClear();
});

describe("RecipeForm — new recipe", () => {
  it("renders empty form with one ingredient row after entering manually", async () => {
    render(<RecipeForm />);
    expect(screen.getByText("New Recipe")).toBeInTheDocument();
    await userEvent.click(screen.getByText("Type manually"));
    expect(screen.getByLabelText("Name")).toHaveValue("");
    expect(screen.getByLabelText("Servings")).toHaveValue(2);
  });

  it("adds an ingredient row when clicking + Add", async () => {
    render(<RecipeForm />);
    await userEvent.click(screen.getByText("Type manually"));
    const addBtn = screen.getByRole("button", { name: "+ Add" });
    await userEvent.click(addBtn);
    const qtyInputs = screen.getAllByPlaceholderText("Qty");
    expect(qtyInputs).toHaveLength(2);
  });

  it("removes an ingredient row when clicking ✕", async () => {
    render(<RecipeForm />);
    await userEvent.click(screen.getByText("Type manually"));
    await userEvent.click(screen.getByRole("button", { name: "+ Add" }));
    const removeButtons = screen.getAllByRole("button", { name: "✕" });
    expect(removeButtons).toHaveLength(2);
    await userEvent.click(removeButtons[1]);
    expect(screen.getAllByPlaceholderText("Qty")).toHaveLength(1);
  });

  it("disables ✕ button when only one ingredient row remains", async () => {
    render(<RecipeForm />);
    await userEvent.click(screen.getByText("Type manually"));
    const removeBtn = screen.getByRole("button", { name: "✕" });
    expect(removeBtn).toBeDisabled();
  });

  it("submits form and navigates to new recipe", async () => {
    mockFetch.mockResolvedValue({
      json: async () => ({ id: "new-id" }),
    });

    render(<RecipeForm />);
    await userEvent.click(screen.getByText("Type manually"));
    await userEvent.type(screen.getByLabelText("Name"), "My Recipe");
    await userEvent.type(screen.getByLabelText("Instructions"), "Step 1");

    const nameInputs = screen.getAllByPlaceholderText("Ingredient name");
    await userEvent.type(nameInputs[0], "Sugar");
    const qtyInputs = screen.getAllByPlaceholderText("Qty");
    await userEvent.type(qtyInputs[0], "100");

    await userEvent.click(screen.getByRole("button", { name: "Create Recipe" }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/recipes", expect.objectContaining({ method: "POST" }));
      expect(mockPush).toHaveBeenCalledWith("/recipes/new-id");
    });
  });

  it("calls router.back() when Cancel is clicked", async () => {
    render(<RecipeForm />);
    await userEvent.click(screen.getByText("Type manually"));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(mockBack).toHaveBeenCalled();
  });
});

describe("RecipeForm — edit recipe", () => {
  it("renders pre-populated form with recipe data", () => {
    render(<RecipeForm initial={mockRecipe} />);
    expect(screen.getByText("Edit Recipe")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("Pasta Carbonara");
    expect(screen.getByLabelText("Servings")).toHaveValue(4);
    expect(screen.getByLabelText("Notes (optional)")).toHaveValue("Use guanciale if possible.");
  });

  it("renders all ingredient rows from initial data", () => {
    render(<RecipeForm initial={mockRecipe} />);
    const nameInputs = screen.getAllByPlaceholderText("Ingredient name");
    expect(nameInputs).toHaveLength(2);
    expect(nameInputs[0]).toHaveValue("Pasta");
    expect(nameInputs[1]).toHaveValue("Eggs");
  });

  it("renders category dropdown for each ingredient", () => {
    render(<RecipeForm initial={mockRecipe} />);
    const selects = screen.getAllByRole("combobox");
    expect(selects).toHaveLength(2);
    expect(selects[0]).toHaveValue("grains & pulses");
    expect(selects[1]).toHaveValue("dairy & eggs");
  });

  it("submits PUT request with recipe id", async () => {
    mockFetch.mockResolvedValue({
      json: async () => ({ id: "recipe-1" }),
    });

    render(<RecipeForm initial={mockRecipe} />);
    await userEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/recipes/recipe-1",
        expect.objectContaining({ method: "PUT" })
      );
    });
  });
});

describe("RecipeForm — AI import panel", () => {
  it("shows action sheet immediately for new recipes", () => {
    render(<RecipeForm />);
    expect(screen.getByText("Take Photo")).toBeInTheDocument();
    expect(screen.getByText("Choose from Library")).toBeInTheDocument();
    expect(screen.getByText("Import from URL")).toBeInTheDocument();
    expect(screen.getByText("Type manually")).toBeInTheDocument();
  });

  it("shows URL input when Import from URL is selected", async () => {
    render(<RecipeForm />);
    await userEvent.click(screen.getByText("Import from URL"));
    expect(screen.getByPlaceholderText("https://…")).toBeInTheDocument();
  });

  it("navigates back when Cancel is clicked on import selection", async () => {
    render(<RecipeForm />);
    expect(screen.getByText("Take Photo")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(mockBack).toHaveBeenCalled();
  });

  it("hides URL input when clicking Cancel in URL panel", async () => {
    render(<RecipeForm />);
    await userEvent.click(screen.getByText("Import from URL"));
    expect(screen.getByPlaceholderText("https://…")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByPlaceholderText("https://…")).not.toBeInTheDocument();
  });

  it("reveals manual form when Type manually is selected", async () => {
    render(<RecipeForm />);
    await userEvent.click(screen.getByText("Type manually"));
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
  });

  it("shows error message when URL import fails", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Could not extract recipe" }),
    });

    render(<RecipeForm />);
    await userEvent.click(screen.getByText("Import from URL"));
    await userEvent.type(screen.getByPlaceholderText("https://…"), "https://example.com");
    await userEvent.click(screen.getByRole("button", { name: "Import" }));

    await waitFor(() => {
      expect(screen.getByText("Could not extract recipe")).toBeInTheDocument();
    });
  });

  it("populates form fields after successful URL import", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        name: "Imported Recipe",
        servings: 2,
        instructions: "Mix everything.",
        tags: ["easy"],
        favourite: false,
        notes: "",
        ingredients: [{ name: "Flour", quantity: 200, unit: "g", preparation: "", category: "baking & sweeteners" }],
      }),
    });

    render(<RecipeForm />);
    await userEvent.click(screen.getByText("Import from URL"));
    await userEvent.type(screen.getByPlaceholderText("https://…"), "https://example.com");
    await userEvent.click(screen.getByRole("button", { name: "Import" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Name")).toHaveValue("Imported Recipe");
    });
  });
});
