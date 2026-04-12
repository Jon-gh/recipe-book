// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PullToRefresh from "@/components/PullToRefresh";

describe("PullToRefresh", () => {
  it("renders children", () => {
    render(
      <PullToRefresh onRefresh={vi.fn().mockResolvedValue(undefined)}>
        <p>Hello world</p>
      </PullToRefresh>
    );
    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("registers and cleans up touch event listeners", () => {
    const addSpy = vi.spyOn(document, "addEventListener");
    const removeSpy = vi.spyOn(document, "removeEventListener");

    const { unmount } = render(
      <PullToRefresh onRefresh={vi.fn().mockResolvedValue(undefined)}>
        <p>content</p>
      </PullToRefresh>
    );

    expect(addSpy).toHaveBeenCalledWith("touchstart", expect.any(Function), { passive: true });
    expect(addSpy).toHaveBeenCalledWith("touchmove", expect.any(Function), { passive: false });
    expect(addSpy).toHaveBeenCalledWith("touchend", expect.any(Function));

    unmount();

    expect(removeSpy).toHaveBeenCalledWith("touchstart", expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith("touchmove", expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith("touchend", expect.any(Function));

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});
