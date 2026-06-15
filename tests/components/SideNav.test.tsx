// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import SideNav from "@/components/SideNav";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, className, "aria-current": ariaCurrent }: {
    href: string;
    children: React.ReactNode;
    className?: string;
    "aria-current"?: "page" | "step" | "location" | "date" | "time" | "true" | "false" | boolean;
  }) => (
    <a href={href} className={className} aria-current={ariaCurrent}>{children}</a>
  ),
}));

vi.mock("next/image", () => ({
  default: ({ src, alt, width, height, className }: {
    src: string; alt: string; width: number; height: number; className?: string;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} width={width} height={height} className={className} />
  ),
}));

const mockUseSession = vi.hoisted(() => vi.fn(() => ({ data: null })));
vi.mock("@/lib/auth-client", () => ({
  authClient: { useSession: () => mockUseSession() },
}));

vi.mock("@/components/cocotte/Cocotte", () => ({
  default: () => <span data-testid="cocotte" />,
}));

import { usePathname } from "next/navigation";
const mockUsePathname = vi.mocked(usePathname);

beforeEach(() => {
  mockUseSession.mockReturnValue({ data: null });
});

describe("SideNav", () => {
  it("renders all nav links", () => {
    mockUsePathname.mockReturnValue("/recipes");
    render(<SideNav />);
    expect(screen.getByText("Recipes")).toBeInTheDocument();
    expect(screen.getByText("Plan")).toBeInTheDocument();
    expect(screen.getByText("Schedule")).toBeInTheDocument();
    expect(screen.getByText("Grocery")).toBeInTheDocument();
  });

  it("marks the active link with aria-current=page", () => {
    mockUsePathname.mockReturnValue("/meal-plan");
    render(<SideNav />);
    expect(screen.getByText("Plan").closest("a")).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("Recipes").closest("a")).not.toHaveAttribute("aria-current");
  });

  it("applies active styling to current route", () => {
    mockUsePathname.mockReturnValue("/grocery-list");
    render(<SideNav />);
    const groceryLink = screen.getByText("Grocery").closest("a")!;
    expect(groceryLink.className).toContain("text-primary");
  });

  it("links point to correct hrefs", () => {
    mockUsePathname.mockReturnValue("/recipes");
    render(<SideNav />);
    expect(screen.getByText("Recipes").closest("a")).toHaveAttribute("href", "/recipes");
    expect(screen.getByText("Plan").closest("a")).toHaveAttribute("href", "/meal-plan");
    expect(screen.getByText("Schedule").closest("a")).toHaveAttribute("href", "/schedule");
    expect(screen.getByText("Grocery").closest("a")).toHaveAttribute("href", "/grocery-list");
  });

  it("returns null on /auth pages", () => {
    mockUsePathname.mockReturnValue("/auth/signin");
    const { container } = render(<SideNav />);
    expect(container.firstChild).toBeNull();
  });

  it("shows user first name when session is active", () => {
    mockUsePathname.mockReturnValue("/recipes");
    mockUseSession.mockReturnValue({
      data: { user: { name: "Alice Smith", email: "alice@example.com" } },
    } as never);
    render(<SideNav />);
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });
});
