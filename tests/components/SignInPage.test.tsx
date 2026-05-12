// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SignInPage from "@/app/auth/signin/page";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const mockSignIn = vi.fn();
const mockSignUp = vi.fn();
vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signIn: { email: (...args: unknown[]) => mockSignIn(...args) },
    signUp: { email: (...args: unknown[]) => mockSignUp(...args) },
    useSession: () => ({ data: null }),
  },
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
});

describe("SignInPage — language picker on sign up", () => {
  it("shows language picker only in sign-up mode", async () => {
    render(<SignInPage />);
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();

    await userEvent.click(screen.getByText(/Don't have an account/));
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("defaults to English", async () => {
    render(<SignInPage />);
    await userEvent.click(screen.getByText(/Don't have an account/));
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.value).toBe("en");
  });

  it("shows all 4 supported locales as options", async () => {
    render(<SignInPage />);
    await userEvent.click(screen.getByText(/Don't have an account/));
    expect(screen.getByRole("option", { name: "English" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Français" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "中文" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Español" })).toBeInTheDocument();
  });

  it("calls PATCH /api/user/locale with selected locale after sign up", async () => {
    mockSignUp.mockResolvedValue({ error: null });
    render(<SignInPage />);
    await userEvent.click(screen.getByText(/Don't have an account/));

    await userEvent.selectOptions(screen.getByRole("combobox"), "fr");
    await userEvent.type(screen.getByPlaceholderText("your@email.com"), "test@example.com");
    await userEvent.type(screen.getByPlaceholderText("Password"), "password123");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/user/locale",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ locale: "fr" }),
        })
      )
    );
  });
});
