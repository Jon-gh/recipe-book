// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SWRConfig } from "swr";
import SchedulePage from "@/app/schedule/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/components/PullToRefresh", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
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

  it("opens slot picker when clicking Add meal", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockEntries })
      .mockResolvedValue({ ok: true, json: async () => [] });

    renderPage();
    await waitFor(() => expect(screen.getAllByText("Add meal").length).toBeGreaterThan(0));

    await userEvent.click(screen.getAllByText("Add meal")[0]);

    await waitFor(() => {
      expect(screen.getByText("Pick a recipe or add a custom note")).toBeInTheDocument();
    });
  });

  it("closes slot picker when clicking X", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockEntries })
      .mockResolvedValue({ ok: true, json: async () => [] });

    renderPage();
    await waitFor(() => expect(screen.getAllByText("Add meal").length).toBeGreaterThan(0));

    await userEvent.click(screen.getAllByText("Add meal")[0]);
    await waitFor(() => expect(screen.getByText("Pick a recipe or add a custom note")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "Close slot picker" }));

    await waitFor(() => {
      expect(screen.queryByText("Pick a recipe or add a custom note")).not.toBeInTheDocument();
    });
  });

  it("posts to /api/scheduled-meals with recipe when confirming slot", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockEntries }) // meal-plan
      .mockResolvedValueOnce({ ok: true, json: async () => [] })           // scheduled-meals
      .mockResolvedValueOnce({ ok: true, json: async () => [] })           // session
      .mockResolvedValue({ ok: true, json: async () => [] });              // POST + revalidations

    renderPage();
    await waitFor(() => expect(screen.getAllByText("Add meal").length).toBeGreaterThan(0));

    await userEvent.click(screen.getAllByText("Add meal")[0]);
    await waitFor(() => expect(screen.getByText("Pasta Carbonara")).toBeInTheDocument());

    await userEvent.click(screen.getByText("Pasta Carbonara")); // select recipe in picker
    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/scheduled-meals",
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  it("posts a note to /api/scheduled-meals when confirming with custom note", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockEntries })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValue({ ok: true, json: async () => [] });

    renderPage();
    await waitFor(() => expect(screen.getAllByText("Add meal").length).toBeGreaterThan(0));

    await userEvent.click(screen.getAllByText("Add meal")[0]);
    await waitFor(() =>
      expect(screen.getByPlaceholderText("e.g. Eating outside, Dinner with friends…")).toBeInTheDocument()
    );

    await userEvent.type(
      screen.getByPlaceholderText("e.g. Eating outside, Dinner with friends…"),
      "Eating outside"
    );
    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/scheduled-meals",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"note":"Eating outside"'),
        })
      );
    });
  });

  it("removes a scheduled meal when clicking Remove", async () => {
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
      .mockResolvedValueOnce({ ok: true, json: async () => mockEntries })
      .mockResolvedValueOnce({ ok: true, json: async () => [scheduledMeal] })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValue({ ok: true, json: async () => [] });

    renderPage();
    await waitFor(() => expect(screen.getByText("Pasta Carbonara")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "Remove" }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/scheduled-meals/10", { method: "DELETE" });
    });
  });
});
