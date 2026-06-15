// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SWRConfig } from "swr";
import CookModePage from "@/app/recipes/[id]/cook/page";

const mockBack = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: mockBack }),
  useParams: () => ({ id: "1" }),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

// WakeLock stub
const mockRelease = vi.fn().mockResolvedValue(undefined);
const mockWakeLockRequest = vi.fn().mockResolvedValue({ release: mockRelease });
Object.defineProperty(navigator, "wakeLock", {
  value: { request: mockWakeLockRequest },
  configurable: true,
  writable: true,
});

const mockRecipe = {
  id: "1",
  name: "Pasta Carbonara",
  servings: 4,
  tags: [],
  favourite: false,
  notes: null,
  nativeLocale: "en",
  createdAt: "",
  updatedAt: "",
  ingredients: [],
  instructions: "Boil water.\n\nCook pasta.\n\nMix eggs and cheese.\n\nCombine and serve.",
};

function renderPage() {
  return render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <CookModePage />
    </SWRConfig>
  );
}

beforeEach(() => {
  mockFetch.mockReset();
  mockFetch.mockResolvedValue({ ok: true, json: async () => mockRecipe });
  mockBack.mockClear();
  mockWakeLockRequest.mockClear();
  mockRelease.mockClear();
});

describe("CookModePage — rendering", () => {
  it("shows step 1 of 4 on load", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Pasta Carbonara")).toBeInTheDocument());
    expect(screen.getByText("Step 1 of 4")).toBeInTheDocument();
    expect(screen.getByText("Boil water.")).toBeInTheDocument();
  });

  it("shows exit button", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Pasta Carbonara")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Exit cook mode" })).toBeInTheDocument();
  });

  it("previous button is disabled on first step", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Pasta Carbonara")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Previous step" })).toBeDisabled();
  });

  it("next button is disabled on last step", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Pasta Carbonara")).toBeInTheDocument());

    // advance to last step
    for (let i = 0; i < 3; i++) {
      await userEvent.click(screen.getByRole("button", { name: "Next step" }));
    }
    expect(screen.getByRole("button", { name: "Next step" })).toBeDisabled();
  });
});

describe("CookModePage — navigation", () => {
  it("advances to step 2 when Next is clicked", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Pasta Carbonara")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "Next step" }));
    expect(screen.getByText("Step 2 of 4")).toBeInTheDocument();
    expect(screen.getByText("Cook pasta.")).toBeInTheDocument();
  });

  it("goes back to step 1 when Previous is clicked from step 2", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Pasta Carbonara")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "Next step" }));
    await userEvent.click(screen.getByRole("button", { name: "Previous step" }));
    expect(screen.getByText("Step 1 of 4")).toBeInTheDocument();
  });

  it("exit button calls router.back()", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Pasta Carbonara")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "Exit cook mode" }));
    expect(mockBack).toHaveBeenCalled();
  });
});

describe("CookModePage — step check-off", () => {
  it("marks step as done when check button is clicked", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Pasta Carbonara")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "Mark step as done" }));
    expect(screen.getByRole("button", { name: "Unmark step" })).toBeInTheDocument();
  });

  it("untoggling a checked step marks it undone", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Pasta Carbonara")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "Mark step as done" }));
    await userEvent.click(screen.getByRole("button", { name: "Unmark step" }));
    expect(screen.getByRole("button", { name: "Mark step as done" })).toBeInTheDocument();
  });
});

describe("CookModePage — wake lock", () => {
  it("requests wake lock on mount", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Pasta Carbonara")).toBeInTheDocument());
    expect(mockWakeLockRequest).toHaveBeenCalledWith("screen");
  });
});
