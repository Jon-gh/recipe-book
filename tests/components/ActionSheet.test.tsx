// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ActionSheet from "@/components/ActionSheet";

const defaultActions = [
  { label: "Save", onClick: vi.fn() },
  { label: "Delete", onClick: vi.fn(), destructive: true },
];

describe("ActionSheet", () => {
  it("does not render when closed", () => {
    render(
      <ActionSheet open={false} onClose={vi.fn()} actions={defaultActions} />
    );
    expect(screen.queryByText("Save")).not.toBeInTheDocument();
  });

  it("renders actions when open", () => {
    render(
      <ActionSheet open={true} onClose={vi.fn()} actions={defaultActions} />
    );
    expect(screen.getByText("Save")).toBeInTheDocument();
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("renders title and message when provided", () => {
    render(
      <ActionSheet
        open={true}
        onClose={vi.fn()}
        actions={defaultActions}
        title="Confirm action"
        message="This cannot be undone"
      />
    );
    expect(screen.getByText("Confirm action")).toBeInTheDocument();
    expect(screen.getByText("This cannot be undone")).toBeInTheDocument();
  });

  it("calls action onClick and onClose when an action is clicked", async () => {
    const onClose = vi.fn();
    const saveAction = { label: "Save", onClick: vi.fn() };
    render(
      <ActionSheet open={true} onClose={onClose} actions={[saveAction]} />
    );
    await userEvent.click(screen.getByText("Save"));
    expect(saveAction.onClick).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when Cancel is clicked", async () => {
    const onClose = vi.fn();
    render(
      <ActionSheet open={true} onClose={onClose} actions={defaultActions} />
    );
    await userEvent.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when backdrop is clicked", () => {
    const onClose = vi.fn();
    render(
      <ActionSheet open={true} onClose={onClose} actions={defaultActions} />
    );
    const dialog = screen.getByRole("dialog");
    const backdrop = dialog.firstChild as HTMLElement;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when Escape is pressed", () => {
    const onClose = vi.fn();
    render(
      <ActionSheet open={true} onClose={onClose} actions={defaultActions} />
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});
