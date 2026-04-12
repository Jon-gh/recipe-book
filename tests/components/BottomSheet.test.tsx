// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import BottomSheet from "@/components/BottomSheet";

describe("BottomSheet", () => {
  it("renders children when open", () => {
    render(
      <BottomSheet open={true} onClose={vi.fn()}>
        <p>Sheet content</p>
      </BottomSheet>
    );
    expect(screen.getByText("Sheet content")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(
      <BottomSheet open={false} onClose={vi.fn()}>
        <p>Sheet content</p>
      </BottomSheet>
    );
    expect(screen.queryByText("Sheet content")).not.toBeInTheDocument();
  });

  it("renders title when provided", () => {
    render(
      <BottomSheet open={true} onClose={vi.fn()} title="My Sheet">
        <p>content</p>
      </BottomSheet>
    );
    expect(screen.getByText("My Sheet")).toBeInTheDocument();
  });

  it("calls onClose when backdrop is clicked", () => {
    const onClose = vi.fn();
    render(
      <BottomSheet open={true} onClose={onClose}>
        <p>content</p>
      </BottomSheet>
    );
    // The backdrop is the first div inside the dialog
    const dialog = screen.getByRole("dialog");
    const backdrop = dialog.firstChild as HTMLElement;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when Escape is pressed", () => {
    const onClose = vi.fn();
    render(
      <BottomSheet open={true} onClose={onClose}>
        <p>content</p>
      </BottomSheet>
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});
