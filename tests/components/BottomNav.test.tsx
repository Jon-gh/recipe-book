// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import BottomNav from "@/components/BottomNav";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

const mockSignOut = vi.hoisted(() => vi.fn());
const mockUseSession = vi.hoisted(() => vi.fn(() => ({ data: null, isPending: false })));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: () => mockUseSession(),
    signOut: mockSignOut,
  },
}));

vi.mock("next/image", () => ({
  default: ({ src, alt, width, height, className }: { src: string; alt: string; width: number; height: number; className?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} width={width} height={height} className={className} />
  ),
}));

import { usePathname } from "next/navigation";
const mockUsePathname = vi.mocked(usePathname);

beforeEach(() => {
  mockUseSession.mockReturnValue({ data: null, isPending: false });
  mockSignOut.mockReset();
});

describe("BottomNav", () => {
  it("renders all four nav tabs plus settings link", () => {
    mockUsePathname.mockReturnValue("/recipes");
    render(<BottomNav />);
    expect(screen.getByText("Recipes")).toBeInTheDocument();
    expect(screen.getByText("Plan")).toBeInTheDocument();
    expect(screen.getByText("Schedule")).toBeInTheDocument();
    expect(screen.getByText("Grocery")).toBeInTheDocument();
    expect(screen.getByText("Sign out").closest("a")).toHaveAttribute("href", "/settings");
  });

  it("shows user's first name on sign-out button when session is active", () => {
    mockUsePathname.mockReturnValue("/recipes");
    mockUseSession.mockReturnValue({ data: { user: { id: "user-1", name: "Jon Doe", email: "jon@example.com" } }, isPending: false } as never);
    render(<BottomNav />);
    expect(screen.getByText("Jon")).toBeInTheDocument();
  });

  it("each tab links to the correct href", () => {
    mockUsePathname.mockReturnValue("/recipes");
    render(<BottomNav />);
    expect(screen.getByText("Recipes").closest("a")).toHaveAttribute("href", "/recipes");
    expect(screen.getByText("Plan").closest("a")).toHaveAttribute("href", "/meal-plan");
    expect(screen.getByText("Schedule").closest("a")).toHaveAttribute("href", "/schedule");
    expect(screen.getByText("Grocery").closest("a")).toHaveAttribute("href", "/grocery-list");
  });

  it("highlights Recipes tab when on /recipes", () => {
    mockUsePathname.mockReturnValue("/recipes");
    render(<BottomNav />);
    const recipesLink = screen.getByText("Recipes").closest("a")!;
    expect(recipesLink.className).toContain("text-primary");
    expect(screen.getByText("Plan").closest("a")!.className).not.toContain("text-primary");
  });

  it("highlights Recipes tab when on a recipe detail page", () => {
    mockUsePathname.mockReturnValue("/recipes/abc123");
    render(<BottomNav />);
    const recipesLink = screen.getByText("Recipes").closest("a")!;
    expect(recipesLink.className).toContain("text-primary");
  });

  it("highlights Plan tab when on /meal-plan", () => {
    mockUsePathname.mockReturnValue("/meal-plan");
    render(<BottomNav />);
    const planLink = screen.getByText("Plan").closest("a")!;
    expect(planLink.className).toContain("text-primary");
    expect(screen.getByText("Recipes").closest("a")!.className).not.toContain("text-primary");
  });

  it("highlights Schedule tab when on /schedule", () => {
    mockUsePathname.mockReturnValue("/schedule");
    render(<BottomNav />);
    const scheduleLink = screen.getByText("Schedule").closest("a")!;
    expect(scheduleLink.className).toContain("text-primary");
    expect(screen.getByText("Recipes").closest("a")!.className).not.toContain("text-primary");
  });

  it("highlights Grocery tab when on /grocery-list", () => {
    mockUsePathname.mockReturnValue("/grocery-list");
    render(<BottomNav />);
    const groceryLink = screen.getByText("Grocery").closest("a")!;
    expect(groceryLink.className).toContain("text-primary");
    expect(screen.getByText("Recipes").closest("a")!.className).not.toContain("text-primary");
  });

  it("settings link navigates to /settings", () => {
    mockUsePathname.mockReturnValue("/recipes");
    render(<BottomNav />);
    expect(screen.getByText("Sign out").closest("a")).toHaveAttribute("href", "/settings");
  });
});
