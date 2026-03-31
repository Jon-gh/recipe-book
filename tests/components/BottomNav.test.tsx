// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import BottomNav from "@/components/BottomNav";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

import { usePathname } from "next/navigation";
const mockUsePathname = vi.mocked(usePathname);

describe("BottomNav", () => {
  it("renders all three tabs", () => {
    mockUsePathname.mockReturnValue("/recipes");
    render(<BottomNav />);
    expect(screen.getByText("Recipes")).toBeInTheDocument();
    expect(screen.getByText("Meal Plan")).toBeInTheDocument();
    expect(screen.getByText("Grocery List")).toBeInTheDocument();
  });

  it("each tab links to the correct href", () => {
    mockUsePathname.mockReturnValue("/recipes");
    render(<BottomNav />);
    expect(screen.getByText("Recipes").closest("a")).toHaveAttribute("href", "/recipes");
    expect(screen.getByText("Meal Plan").closest("a")).toHaveAttribute("href", "/meal-plan");
    expect(screen.getByText("Grocery List").closest("a")).toHaveAttribute("href", "/grocery-list");
  });

  it("highlights Recipes tab when on /recipes", () => {
    mockUsePathname.mockReturnValue("/recipes");
    render(<BottomNav />);
    const recipesLink = screen.getByText("Recipes").closest("a")!;
    expect(recipesLink.className).toContain("text-green-600");
    expect(screen.getByText("Meal Plan").closest("a")!.className).not.toContain("text-green-600");
  });

  it("highlights Recipes tab when on a recipe detail page", () => {
    mockUsePathname.mockReturnValue("/recipes/abc123");
    render(<BottomNav />);
    const recipesLink = screen.getByText("Recipes").closest("a")!;
    expect(recipesLink.className).toContain("text-green-600");
  });

  it("highlights Meal Plan tab when on /meal-plan", () => {
    mockUsePathname.mockReturnValue("/meal-plan");
    render(<BottomNav />);
    const mealPlanLink = screen.getByText("Meal Plan").closest("a")!;
    expect(mealPlanLink.className).toContain("text-green-600");
    expect(screen.getByText("Recipes").closest("a")!.className).not.toContain("text-green-600");
  });

  it("highlights Grocery List tab when on /grocery-list", () => {
    mockUsePathname.mockReturnValue("/grocery-list");
    render(<BottomNav />);
    const groceryLink = screen.getByText("Grocery List").closest("a")!;
    expect(groceryLink.className).toContain("text-green-600");
    expect(screen.getByText("Recipes").closest("a")!.className).not.toContain("text-green-600");
  });
});
