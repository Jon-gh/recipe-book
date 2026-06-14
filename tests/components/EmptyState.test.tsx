// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import EmptyState from "@/components/EmptyState";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

describe("EmptyState", () => {
  it("renders title", () => {
    render(<EmptyState pose="wave" title="Nothing here yet" />);
    expect(screen.getByText("Nothing here yet")).toBeInTheDocument();
  });

  it("renders subtext when provided", () => {
    render(<EmptyState pose="wave" title="Empty" subtext="Try adding something" />);
    expect(screen.getByText("Try adding something")).toBeInTheDocument();
  });

  it("does not render subtext when omitted", () => {
    const { container } = render(<EmptyState pose="wave" title="Empty" />);
    expect(container.querySelectorAll("p").length).toBe(1);
  });

  it("renders a link CTA when action has href", () => {
    render(
      <EmptyState
        pose="wave"
        title="Empty"
        action={{ label: "Browse Recipes", href: "/recipes" }}
      />
    );
    const link = screen.getByRole("link", { name: "Browse Recipes" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/recipes");
  });

  it("renders a button CTA when action has onClick", async () => {
    const onClick = vi.fn();
    render(
      <EmptyState
        pose="wave"
        title="Empty"
        action={{ label: "Add first recipe", onClick }}
      />
    );
    const btn = screen.getByRole("button", { name: "Add first recipe" });
    expect(btn).toBeInTheDocument();
    await userEvent.click(btn);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("does not render a CTA when action is omitted", () => {
    render(<EmptyState pose="shrug" title="Error" subtext="Something went wrong" />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("renders an SVG (Cocotte mascot)", () => {
    const { container } = render(<EmptyState pose="wave" title="Empty" />);
    expect(container.querySelector("svg")).not.toBeNull();
  });
});
