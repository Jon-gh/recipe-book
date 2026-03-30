// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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
    { id: 1, name: "Pasta", quantity: 400, unit: "g", preparation: "", recipeId: "recipe-1" },
    { id: 2, name: "Eggs", quantity: 4, unit: "", preparation: "beaten", recipeId: "recipe-1" },
  ],
};

beforeEach(() => {
  mockPush.mockClear();
  mockBack.mockClear();
  mockFetch.mockClear();
});

describe("RecipeForm — new recipe", () => {
  it("renders empty form with one ingredient row", () => {
    render(<RecipeForm />);
    expect(screen.getByText("New Recipe")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("");
    expect(screen.getByLabelText("Servings")).toHaveValue(2);
  });

  it("adds an ingredient row when clicking + Add", async () => {
    render(<RecipeForm />);
    const addBtn = screen.getByRole("button", { name: "+ Add" });
    await userEvent.click(addBtn);
    // 2 rows means 2 qty inputs
    const qtyInputs = screen.getAllByPlaceholderText("1");
    expect(qtyInputs).toHaveLength(2);
  });

  it("removes an ingredient row when clicking ✕", async () => {
    render(<RecipeForm />);
    // Add a second row first
    await userEvent.click(screen.getByRole("button", { name: "+ Add" }));
    const removeButtons = screen.getAllByRole("button", { name: "✕" });
    expect(removeButtons).toHaveLength(2);
    await userEvent.click(removeButtons[1]);
    expect(screen.getAllByPlaceholderText("1")).toHaveLength(1);
  });

  it("disables ✕ button when only one ingredient row remains", () => {
    render(<RecipeForm />);
    const removeBtn = screen.getByRole("button", { name: "✕" });
    expect(removeBtn).toBeDisabled();
  });

  it("submits form and navigates to new recipe", async () => {
    mockFetch.mockResolvedValue({
      json: async () => ({ id: "new-id" }),
    });

    render(<RecipeForm />);
    await userEvent.type(screen.getByLabelText("Name"), "My Recipe");
    await userEvent.type(screen.getByLabelText("Instructions"), "Step 1");

    const nameInputs = screen.getAllByPlaceholderText("Flour");
    await userEvent.type(nameInputs[0], "Sugar");
    const qtyInputs = screen.getAllByPlaceholderText("1");
    await userEvent.type(qtyInputs[0], "100");

    await userEvent.click(screen.getByRole("button", { name: "Create Recipe" }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/recipes", expect.objectContaining({ method: "POST" }));
      expect(mockPush).toHaveBeenCalledWith("/recipes/new-id");
    });
  });

  it("calls router.back() when Cancel is clicked", async () => {
    render(<RecipeForm />);
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
    const nameInputs = screen.getAllByPlaceholderText("Flour");
    expect(nameInputs).toHaveLength(2);
    expect(nameInputs[0]).toHaveValue("Pasta");
    expect(nameInputs[1]).toHaveValue("Eggs");
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
  it("shows text import panel when clicking Import from text", async () => {
    render(<RecipeForm />);
    await userEvent.click(screen.getByRole("button", { name: "Import from text" }));
    expect(screen.getByPlaceholderText("Paste recipe text here…")).toBeInTheDocument();
  });

  it("shows URL import panel when clicking Import from url", async () => {
    render(<RecipeForm />);
    await userEvent.click(screen.getByRole("button", { name: "Import from url" }));
    expect(screen.getByPlaceholderText("https://…")).toBeInTheDocument();
  });

  it("hides import panel when clicking the same button again", async () => {
    render(<RecipeForm />);
    await userEvent.click(screen.getByRole("button", { name: "Import from text" }));
    await userEvent.click(screen.getByRole("button", { name: "Import from text" }));
    expect(screen.queryByPlaceholderText("Paste recipe text here…")).not.toBeInTheDocument();
  });

  it("hides import panel when clicking Cancel", async () => {
    render(<RecipeForm />);
    await userEvent.click(screen.getByRole("button", { name: "Import from text" }));
    // Two Cancel buttons exist (panel + form footer); click the first (panel)
    await userEvent.click(screen.getAllByRole("button", { name: "Cancel" })[0]);
    expect(screen.queryByPlaceholderText("Paste recipe text here…")).not.toBeInTheDocument();
  });

  it("shows error message when import fails", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Could not extract recipe" }),
    });

    render(<RecipeForm />);
    await userEvent.click(screen.getByRole("button", { name: "Import from text" }));
    await userEvent.type(screen.getByPlaceholderText("Paste recipe text here…"), "some text");
    await userEvent.click(screen.getByRole("button", { name: "Import" }));

    await waitFor(() => {
      expect(screen.getByText("Could not extract recipe")).toBeInTheDocument();
    });
  });

  it("populates form fields after successful text import", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        name: "Imported Recipe",
        servings: 2,
        instructions: "Mix everything.",
        tags: ["easy"],
        favourite: false,
        notes: "",
        ingredients: [{ name: "Flour", quantity: 200, unit: "g", preparation: "" }],
      }),
    });

    render(<RecipeForm />);
    await userEvent.click(screen.getByRole("button", { name: "Import from text" }));
    await userEvent.type(screen.getByPlaceholderText("Paste recipe text here…"), "some text");
    await userEvent.click(screen.getByRole("button", { name: "Import" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Name")).toHaveValue("Imported Recipe");
    });
  });
});
