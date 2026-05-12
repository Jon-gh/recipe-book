// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SettingsPage from "@/app/settings/page";

const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const mockSignOut = vi.fn();
vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signOut: (...args: unknown[]) => mockSignOut(...args),
  },
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockImplementation((url: string, options?: RequestInit) => {
    const method = (options?.method ?? "GET").toUpperCase();
    if (url === "/api/user/locale" && method === "GET") {
      return Promise.resolve({ json: async () => ({ locale: "en" }) });
    }
    if (url === "/api/user/locale" && method === "PATCH") {
      return Promise.resolve({ ok: true, json: async () => ({}) });
    }
    return Promise.resolve({ json: async () => ({}) });
  });
});

describe("SettingsPage", () => {
  it("renders the settings title", async () => {
    render(<SettingsPage />);
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("loads and shows current locale in selector", async () => {
    render(<SettingsPage />);
    await waitFor(() => {
      const select = screen.getByRole("combobox") as HTMLSelectElement;
      expect(select.value).toBe("en");
    });
  });

  it("shows all 4 supported locales", async () => {
    render(<SettingsPage />);
    await waitFor(() => expect(screen.getByRole("combobox")).toBeInTheDocument());
    expect(screen.getByRole("option", { name: "English" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Français" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "中文" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Español" })).toBeInTheDocument();
  });

  it("calls PATCH /api/user/locale when language is changed", async () => {
    render(<SettingsPage />);
    await waitFor(() => expect(screen.getByRole("combobox")).toBeInTheDocument());

    await userEvent.selectOptions(screen.getByRole("combobox"), "es");

    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/user/locale",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ locale: "es" }),
        })
      )
    );
  });

  it("shows saved confirmation after language change", async () => {
    render(<SettingsPage />);
    await waitFor(() => expect(screen.getByRole("combobox")).toBeInTheDocument());

    await userEvent.selectOptions(screen.getByRole("combobox"), "fr");

    await waitFor(() => expect(screen.getByText("Saved")).toBeInTheDocument());
  });

  it("has a sign out button", async () => {
    render(<SettingsPage />);
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });
});
