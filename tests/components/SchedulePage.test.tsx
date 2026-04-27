// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import SchedulePage from "@/app/schedule/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockEntries = [
  {
    id: 1,
    targetServings: 4,
    recipeId: "r1",
    recipe: {
      id: "r1",
      name: "Pasta Carbonara",
      servings: 4,
      tags: [],
      favourite: false,
      ingredients: [],
    },
    scheduledMeals: [],
  },
];

function renderPage() {
  return render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <SchedulePage />
    </SWRConfig>
  );
}

beforeEach(() => {
  mockFetch.mockClear();
});

describe("SchedulePage", () => {
  it("shows loading state initially", () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => [] });
    renderPage();
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("shows empty state when no entries in plan", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => [] });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("No recipes in your plan yet")).toBeInTheDocument();
      expect(screen.getByText("Add recipes in the Plan tab first")).toBeInTheDocument();
    });
  });

  it("shows day cards with Lunch and Dinner rows when entries exist", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockEntries }) // meal-plan
      .mockResolvedValue({ ok: true, json: async () => [] });             // scheduled-meals + session

    renderPage();
    await waitFor(() => expect(screen.getByText("Schedule")).toBeInTheDocument());

    // Day cards show Lunch and Dinner labels for each day
    expect(screen.getAllByText("Lunch").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Dinner").length).toBeGreaterThan(0);
  });

  it("shows Add meal button in empty slots", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockEntries }) // meal-plan
      .mockResolvedValue({ ok: true, json: async () => [] });             // scheduled-meals + session

    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText("Add meal").length).toBeGreaterThan(0);
    });
  });

  it("shows scheduled meal name when a meal is assigned to a slot", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const scheduledMeal = {
      id: 10,
      date: today + "T00:00:00.000Z",
      mealType: "lunch",
      servings: 2,
      note: null,
      mealPlanEntry: mockEntries[0],
    };

    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockEntries }) // meal-plan
      .mockResolvedValueOnce({ ok: true, json: async () => [scheduledMeal] }) // scheduled-meals
      .mockResolvedValue({ ok: true, json: async () => [] }); // session

    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Pasta Carbonara")).toBeInTheDocument();
    });
  });
});
