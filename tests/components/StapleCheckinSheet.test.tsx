// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StapleCheckinSheet from "@/components/StapleCheckinSheet";
import type { StapleItem } from "@/components/StapleCheckinSheet";
import type { ShoppingListItem } from "@/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/components/BottomSheet", () => ({
  default: ({ open, children, title }: { open: boolean; children: React.ReactNode; title?: string }) =>
    open ? <div role="dialog">{title && <h2>{title}</h2>}{children}</div> : null,
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

const salt: StapleItem = { productId: 1, name: "Salt", defaultQuantity: 1, defaultUnit: "jar" };
const pepper: StapleItem = { productId: 2, name: "Pepper", defaultQuantity: 1, defaultUnit: "" };

const noShoppingItems: ShoppingListItem[] = [];
const saltInList: ShoppingListItem[] = [
  { id: 10, quantity: 1, unit: "jar", product: { id: 1, name: "Salt", category: "spices & herbs", defaultUnit: "jar", defaultQuantity: 1, source: "user" } },
];

function renderSheet(props: Partial<Parameters<typeof StapleCheckinSheet>[0]> = {}) {
  return render(
    <StapleCheckinSheet
      open={true}
      staples={[salt, pepper]}
      shoppingListItems={noShoppingItems}
      onDone={vi.fn()}
      onDefer={vi.fn()}
      {...props}
    />
  );
}

beforeEach(() => {
  mockFetch.mockClear();
  mockFetch.mockResolvedValue({ json: async () => ({}) });
});

describe("StapleCheckinSheet", () => {
  it("renders staple items", () => {
    renderSheet();
    expect(screen.getByText("Salt")).toBeInTheDocument();
    expect(screen.getByText("Pepper")).toBeInTheDocument();
  });

  it("pre-fills quantity and unit from product defaults", () => {
    renderSheet();
    const inputs = screen.getAllByLabelText("Quantity");
    expect(inputs[0]).toHaveValue(1);
    const unitInputs = screen.getAllByLabelText("Unit");
    expect(unitInputs[0]).toHaveValue("jar");
  });

  it("filters out staples already in the shopping list", () => {
    renderSheet({ shoppingListItems: saltInList });
    expect(screen.queryByText("Salt")).not.toBeInTheDocument();
    expect(screen.getByText("Pepper")).toBeInTheDocument();
  });

  it("shows all-covered state when all staples are already in shopping list", () => {
    renderSheet({ staples: [salt], shoppingListItems: saltInList });
    // uses real en.json message (via global test mock)
    expect(screen.getByText("All your staples are covered 👍")).toBeInTheDocument();
  });

  it("calls POST /api/shopping-list when add button tapped", async () => {
    renderSheet();
    await userEvent.click(screen.getAllByLabelText("Add Salt")[0]);
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/shopping-list",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "Salt", quantity: 1, unit: "jar" }),
      })
    );
  });

  it("removes item from list after adding", async () => {
    renderSheet();
    expect(screen.getByText("Salt")).toBeInTheDocument();
    await userEvent.click(screen.getAllByLabelText("Add Salt")[0]);
    expect(screen.queryByText("Salt")).not.toBeInTheDocument();
  });

  it("calls onDone when Done is tapped", async () => {
    const onDone = vi.fn();
    renderSheet({ onDone });
    await userEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(onDone).toHaveBeenCalled();
  });

  it("calls onDefer when Review Later is tapped", async () => {
    const onDefer = vi.fn();
    renderSheet({ onDefer });
    await userEvent.click(screen.getByRole("button", { name: "Review Later" }));
    expect(onDefer).toHaveBeenCalled();
  });

  it("uses user-edited quantity when adding", async () => {
    renderSheet();
    const qtyInputs = screen.getAllByLabelText("Quantity");
    await userEvent.clear(qtyInputs[0]);
    await userEvent.type(qtyInputs[0], "2");
    await userEvent.click(screen.getAllByLabelText("Add Salt")[0]);
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/shopping-list",
      expect.objectContaining({
        body: JSON.stringify({ name: "Salt", quantity: 2, unit: "jar" }),
      })
    );
  });
});
