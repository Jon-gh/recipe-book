// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import LoadingState from "@/components/LoadingState";

describe("LoadingState", () => {
  it("renders the message", () => {
    render(<LoadingState message="Loading…" />);
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("renders the Cocotte stir SVG", () => {
    const { container } = render(<LoadingState message="Gathering your ingredients…" />);
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("renders a different message correctly", () => {
    render(<LoadingState message="Building your week…" />);
    expect(screen.getByText("Building your week…")).toBeInTheDocument();
  });
});
