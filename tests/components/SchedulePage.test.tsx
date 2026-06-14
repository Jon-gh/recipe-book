// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SWRConfig } from "swr";
import SchedulePage from "@/app/schedule/page";
import { ToastProvider } from "@/components/Toast";

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

function makeWeek() {
  const today = new Date();
  // Find Monday of current week
  const d = new Date(today);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  const weekStart = d.toISOString().slice(0, 10);
  d.setDate(d.getDate() + 6);
  const weekEnd = d.toISOString().slice(0, 10);
  return { weekStart, weekEnd };
}

const { weekStart, weekEnd } = makeWeek();
const mockSession = { checkedKeys: [], weekStart, weekEnd };

function setupFetch({
  entries = mockEntries,
  scheduled = [] as object[],
  session = mockSession as object,
} = {}) {
  mockFetch.mockImplementation((url: string) => {
    if (url === "/api/meal-plan") return Promise.resolve({ ok: true, json: async () => entries });
    if (url === "/api/shopping-session") return Promise.resolve({ ok: true, json: async () => session });
    if (url.startsWith("/api/scheduled-meals")) return Promise.resolve({ ok: true, json: async () => scheduled });
    if (url.startsWith("/api/scheduled-meals/")) return Promise.resolve({ ok: true, json: async () => ({}) });
    return Promise.resolve({ ok: true, json: async () => [] });
  });
}

function renderPage() {
  return render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <ToastProvider>
        <SchedulePage />
      </ToastProvider>
    </SWRConfig>
  );
}

beforeEach(() => {
  mockFetch.mockClear();
});

describe("SchedulePage", () => {
  it("shows loading state initially", () => {
    setupFetch();
    renderPage();
    expect(screen.getByText("Plotting your week…")).toBeInTheDocument();
  });

  it("shows 'no week' empty state when no session week is set", async () => {
    setupFetch({ session: { checkedKeys: [], weekStart: null, weekEnd: null } });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("No week planned yet")).toBeInTheDocument();
      expect(screen.getByText("Start a new week from the Plan tab")).toBeInTheDocument();
    });
  });

  it("shows 'no entries' empty state when week is set but plan is empty", async () => {
    setupFetch({ entries: [] });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Nothing scheduled this week")).toBeInTheDocument();
      expect(screen.getByText("Head to Recipes to pick what you're cooking")).toBeInTheDocument();
    });
  });

  it("shows error state when fetch fails", async () => {
    mockFetch.mockImplementation(() => Promise.reject(new Error("Network error")));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Something got burnt.")).toBeInTheDocument();
    });
  });

  it("shows week range header from session", async () => {
    setupFetch();
    renderPage();
    await waitFor(() => expect(screen.getByText("Schedule")).toBeInTheDocument());
    // Header should show a formatted date range string
    await waitFor(() => {
      const heading = screen.getByText(/–/);
      expect(heading).toBeInTheDocument();
    });
  });

  it("shows ☀️ and 🌙 emoji labels on meal slots", async () => {
    setupFetch();
    renderPage();
    await waitFor(() => expect(screen.getByText("Schedule")).toBeInTheDocument());
    await waitFor(() => {
      expect(screen.getAllByText("☀️").length).toBeGreaterThan(0);
      expect(screen.getAllByText("🌙").length).toBeGreaterThan(0);
    });
  });

  it("shows Add meal dashed pill buttons in empty slots", async () => {
    setupFetch();
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText(/Add meal/).length).toBeGreaterThan(0);
    });
  });

  it("highlights today's card with a Today pill", async () => {
    setupFetch();
    renderPage();
    await waitFor(() => {
      const todayPills = screen.queryAllByText("Today");
      // Today is within the current week, so exactly one Today pill should appear
      expect(todayPills.length).toBe(1);
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
    setupFetch({ scheduled: [scheduledMeal] });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Pasta Carbonara")).toBeInTheDocument();
    });
  });

  it("opens slot picker when clicking Add meal", async () => {
    setupFetch();
    renderPage();
    await waitFor(() => expect(screen.getAllByText(/Add meal/).length).toBeGreaterThan(0));

    await userEvent.click(screen.getAllByText(/Add meal/)[0]);

    await waitFor(() => {
      expect(screen.getByText("Pick a recipe or add a custom note")).toBeInTheDocument();
    });
  });

  it("closes slot picker on Escape key", async () => {
    setupFetch();
    renderPage();
    await waitFor(() => expect(screen.getAllByText(/Add meal/).length).toBeGreaterThan(0));

    await userEvent.click(screen.getAllByText(/Add meal/)[0]);
    await waitFor(() => expect(screen.getByText("Pick a recipe or add a custom note")).toBeInTheDocument());

    await userEvent.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByText("Pick a recipe or add a custom note")).not.toBeInTheDocument();
    });
  });

  it("slot picker opens as a dialog", async () => {
    setupFetch();
    renderPage();
    await waitFor(() => expect(screen.getAllByText(/Add meal/).length).toBeGreaterThan(0));

    await userEvent.click(screen.getAllByText(/Add meal/)[0]);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });

  it("posts to /api/scheduled-meals with recipe when confirming slot", async () => {
    setupFetch();
    renderPage();
    await waitFor(() => expect(screen.getAllByText(/Add meal/).length).toBeGreaterThan(0));

    await userEvent.click(screen.getAllByText(/Add meal/)[0]);
    await waitFor(() => expect(screen.getByText("Pasta Carbonara")).toBeInTheDocument());

    await userEvent.click(screen.getByText("Pasta Carbonara"));
    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/scheduled-meals",
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  it("posts a note to /api/scheduled-meals when confirming with custom note", async () => {
    setupFetch();
    renderPage();
    await waitFor(() => expect(screen.getAllByText(/Add meal/).length).toBeGreaterThan(0));

    await userEvent.click(screen.getAllByText(/Add meal/)[0]);
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
    setupFetch({ scheduled: [scheduledMeal] });
    renderPage();
    await waitFor(() => expect(screen.getByText("Pasta Carbonara")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "Remove meal" }));

    // Optimistic removal: meal disappears immediately; DELETE is deferred
    await waitFor(() => expect(screen.queryByText("Pasta Carbonara")).not.toBeInTheDocument());
    // DELETE is not called immediately — only after undo window
    expect(mockFetch).not.toHaveBeenCalledWith("/api/scheduled-meals/10", { method: "DELETE" });
  });
});
