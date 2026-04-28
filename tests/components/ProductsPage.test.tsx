// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SWRConfig } from "swr";
import ProductsPage from "@/app/products/page";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

const userProducts = [
  { id: 1, name: "tomatoe", category: "fruit & veg", defaultUnit: "", defaultQuantity: 1, source: "user" },
  { id: 2, name: "feta chese", category: "dairy & eggs", defaultUnit: "g", defaultQuantity: 1, source: "user" },
];

function setupFetch(products = userProducts as object[]) {
  mockFetch.mockImplementation((url: string, options?: RequestInit) => {
    const method = (options?.method ?? "GET").toUpperCase();
    if (url === "/api/products?source=user" && method === "GET") {
      return Promise.resolve({ json: async () => products });
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
      <ProductsPage />
    </SWRConfig>
  );
}

beforeEach(() => {
  mockFetch.mockClear();
  setupFetch();
});

describe("ProductsPage", () => {
  it("shows loading state", () => {
    renderPage();
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("lists all user products after loading", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("tomatoe")).toBeInTheDocument();
      expect(screen.getByText("feta chese")).toBeInTheDocument();
    });
  });

  it("shows product category and default unit", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("feta chese")).toBeInTheDocument());
    expect(screen.getByText(/dairy & eggs · g/)).toBeInTheDocument();
  });

  it("shows edit button for each product", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("tomatoe")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Edit tomatoe" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit feta chese" })).toBeInTheDocument();
  });

  it("shows empty state when no user products", async () => {
    setupFetch([]);
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/No personal items yet/)).toBeInTheDocument()
    );
  });

  it("shows back link to grocery list", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("tomatoe")).toBeInTheDocument());
    expect(document.querySelector('a[href="/grocery-list"]')).toBeTruthy();
  });
});

describe("ProductsPage — edit product", () => {
  it("opens edit sheet when pencil button is clicked", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("tomatoe")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "Edit tomatoe" }));

    await waitFor(() =>
      expect(screen.getByDisplayValue("tomatoe")).toBeInTheDocument()
    );
  });

  it("pre-fills the edit form with current values", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("feta chese")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "Edit feta chese" }));

    await waitFor(() => {
      expect(screen.getByDisplayValue("feta chese")).toBeInTheDocument();
      expect(screen.getByDisplayValue("g")).toBeInTheDocument();
    });
  });

  it("calls PUT with updated values on save", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("tomatoe")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "Edit tomatoe" }));
    await waitFor(() => expect(screen.getByDisplayValue("tomatoe")).toBeInTheDocument());

    const nameInput = screen.getByDisplayValue("tomatoe");
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "tomato");

    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/products/1",
        expect.objectContaining({
          method: "PUT",
          body: expect.stringContaining('"name":"tomato"'),
        })
      )
    );
  });
});
