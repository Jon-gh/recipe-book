// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GroceryListPage from "@/app/grocery-list/page";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockItems = [
  { name: "Pasta", quantity: 400, unit: "g" },
  { name: "Eggs", quantity: 4, unit: "" },
  { name: "Flour", quantity: 0.5, unit: "kg" },
];

beforeEach(() => {
  mockFetch.mockClear();
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
});
