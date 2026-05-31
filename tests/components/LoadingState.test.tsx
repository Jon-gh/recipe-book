// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import LoadingState from "@/components/LoadingState";

describe("LoadingState", () => {
  it("renders the emoji", () => {
    render(<LoadingState emoji="🍳" message="Loading…" />);
    expect(screen.getByText("🍳")).toBeInTheDocument();
  });

  it("renders the message", () => {
    render(<LoadingState emoji="🛒" message="Gathering your ingredients…" />);
    expect(screen.getByText("Gathering your ingredients…")).toBeInTheDocument();
  });

  it("applies animate-pulse to the emoji element", () => {
    render(<LoadingState emoji="📅" message="Building your week…" />);
    const emojiEl = screen.getByText("📅");
    expect(emojiEl.className).toContain("animate-pulse");
  });
});
