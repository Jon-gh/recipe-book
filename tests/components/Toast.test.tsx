// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, act, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider, useToast } from "@/components/Toast";

function ToastTrigger({
  message,
  action,
  duration,
  variant,
}: {
  message: string;
  action?: { label: string; onClick: () => void };
  duration?: number;
  variant?: "default" | "error";
}) {
  const { show, dismiss } = useToast();
  return (
    <>
      <button onClick={() => show(message, { action, duration, variant })}>Show</button>
      <button onClick={dismiss}>Dismiss</button>
    </>
  );
}

function renderWithToast(props: React.ComponentProps<typeof ToastTrigger>) {
  return render(
    <ToastProvider>
      <ToastTrigger {...props} />
    </ToastProvider>
  );
}

afterEach(() => {
  vi.useRealTimers();
});

describe("Toast", () => {
  it("renders the message when show is called", async () => {
    renderWithToast({ message: "Hello toast" });
    await userEvent.click(screen.getByRole("button", { name: "Show" }));
    expect(screen.getByText("Hello toast")).toBeInTheDocument();
  });

  it("renders the action button when provided", async () => {
    const onAction = vi.fn();
    renderWithToast({
      message: "Item removed",
      action: { label: "Undo", onClick: onAction },
    });
    await userEvent.click(screen.getByRole("button", { name: "Show" }));
    const undoBtn = screen.getByRole("button", { name: "Undo" });
    expect(undoBtn).toBeInTheDocument();
    await userEvent.click(undoBtn);
    expect(onAction).toHaveBeenCalled();
  });

  it("dismisses automatically after the duration", () => {
    vi.useFakeTimers();
    renderWithToast({ message: "Auto dismiss", duration: 1000 });

    act(() => { fireEvent.click(screen.getByRole("button", { name: "Show" })); });
    expect(screen.getByText("Auto dismiss")).toBeInTheDocument();

    // Advance past duration (1000ms) + hide animation (200ms)
    act(() => vi.advanceTimersByTime(1400));
    expect(screen.queryByText("Auto dismiss")).not.toBeInTheDocument();
  });

  it("has aria-live region for screen reader announcements", () => {
    render(
      <ToastProvider>
        <div />
      </ToastProvider>
    );
    expect(document.querySelector('[aria-live="polite"]')).toBeInTheDocument();
  });
});
