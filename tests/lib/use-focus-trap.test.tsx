// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useFocusTrap } from "@/lib/use-focus-trap";

function TrapFixture({ active }: { active: boolean }) {
  const panelRef = useFocusTrap(active);

  return (
    <div>
      <button id="outside">Outside</button>
      <div ref={panelRef} data-testid="panel">
        <button id="first">First</button>
        <button id="second">Second</button>
        <button id="third">Third</button>
      </div>
    </div>
  );
}

describe("useFocusTrap", () => {
  it("moves focus to the first focusable element when activated", () => {
    render(<TrapFixture active={true} />);
    expect(document.activeElement?.id).toBe("first");
  });

  it("does not move focus when inactive", () => {
    render(<TrapFixture active={false} />);
    expect(document.activeElement?.id).not.toBe("first");
  });

  it("wraps Tab from last to first element", () => {
    render(<TrapFixture active={true} />);
    const panel = screen.getByTestId("panel");
    const third = document.getElementById("third")!;
    third.focus();
    expect(document.activeElement?.id).toBe("third");
    fireEvent.keyDown(panel, { key: "Tab", shiftKey: false });
    expect(document.activeElement?.id).toBe("first");
  });

  it("wraps Shift+Tab from first to last element", () => {
    render(<TrapFixture active={true} />);
    const panel = screen.getByTestId("panel");
    const first = document.getElementById("first")!;
    first.focus();
    fireEvent.keyDown(panel, { key: "Tab", shiftKey: true });
    expect(document.activeElement?.id).toBe("third");
  });
});
