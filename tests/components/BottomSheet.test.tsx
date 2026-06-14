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

  it("sets aria-labelledby when title is provided", () => {
    render(
      <BottomSheet open={true} onClose={vi.fn()} title="Labelled Sheet">
        <p>content</p>
      </BottomSheet>
    );
    const dialog = screen.getByRole("dialog");
    const labelledById = dialog.getAttribute("aria-labelledby");
    expect(labelledById).toBeTruthy();
    const titleEl = document.getElementById(labelledById!);
    expect(titleEl?.textContent).toBe("Labelled Sheet");
  });

  it("sets aria-label when no title is provided", () => {
    render(
      <BottomSheet open={true} onClose={vi.fn()} aria-label="Custom label">
        <p>content</p>
      </BottomSheet>
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-label")).toBe("Custom label");
    expect(dialog.getAttribute("aria-labelledby")).toBeNull();
  });

  it("moves focus into the sheet panel on open", () => {
    render(
      <BottomSheet open={true} onClose={vi.fn()}>
        <button>First button</button>
      </BottomSheet>
    );
    expect(document.activeElement?.textContent).toBe("First button");
  });
});
