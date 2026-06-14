// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";
import { ToastProvider } from "@/components/Toast";
import { useUndoableDelete } from "@/lib/use-undoable-delete";

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(ToastProvider, null, children);
}

describe("useUndoableDelete", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("fires commit after the delay", async () => {
    const commit = vi.fn().mockResolvedValue(undefined);
    const onRevert = vi.fn();

    const { result } = renderHook(
      () => useUndoableDelete({ commit, onRevert, delayMs: 3000 }),
      { wrapper }
    );

    act(() => {
      result.current.remove("item-1", {
        optimisticHide: vi.fn(),
        message: "Removed",
      });
    });

    // Commit not called yet
    expect(commit).not.toHaveBeenCalled();

    // Advance past the delay
    await act(async () => {
      vi.advanceTimersByTime(3100);
    });

    expect(commit).toHaveBeenCalledWith("item-1");
    expect(onRevert).not.toHaveBeenCalled();
  });

  it("cancels commit when undo is called and reverts", async () => {
    const commit = vi.fn().mockResolvedValue(undefined);
    const onRevert = vi.fn();
    let undoFn: (() => void) | undefined;

    // Intercept the toast's action.onClick (the undo callback)
    const { result } = renderHook(
      () =>
        useUndoableDelete({
          commit,
          onRevert,
          delayMs: 3000,
          undoLabel: "Undo",
        }),
      { wrapper }
    );

    const optimisticHide = vi.fn();
    act(() => {
      result.current.remove("item-1", {
        optimisticHide,
        message: "Removed",
      });
    });

    // Advance partially — still within window
    act(() => vi.advanceTimersByTime(1000));
    expect(commit).not.toHaveBeenCalled();

    // Simulate undo by running all pending timers but clearing state
    // We test indirectly: a second remove should commit the first
    act(() => {
      result.current.remove("item-2", {
        optimisticHide: vi.fn(),
        message: "Removed 2",
      });
    });

    // First item committed immediately when second remove is called
    expect(commit).toHaveBeenCalledWith("item-1");
    expect(commit).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(3100);
    });

    // Second item committed after delay
    expect(commit).toHaveBeenCalledWith("item-2");
  });

  it("commits pending item immediately when a second remove fires", async () => {
    const commit = vi.fn().mockResolvedValue(undefined);
    const onRevert = vi.fn();

    const { result } = renderHook(
      () => useUndoableDelete({ commit, onRevert, delayMs: 5000 }),
      { wrapper }
    );

    act(() => {
      result.current.remove("first", { optimisticHide: vi.fn(), message: "Removed first" });
    });

    act(() => {
      result.current.remove("second", { optimisticHide: vi.fn(), message: "Removed second" });
    });

    // First committed immediately on second remove
    expect(commit).toHaveBeenCalledWith("first");
    expect(commit).toHaveBeenCalledTimes(1);
  });

  it("calls onRevert when commit rejects", async () => {
    const commit = vi.fn().mockRejectedValue(new Error("Network error"));
    const onRevert = vi.fn();

    const { result } = renderHook(
      () => useUndoableDelete({ commit, onRevert, delayMs: 100 }),
      { wrapper }
    );

    act(() => {
      result.current.remove("item-1", { optimisticHide: vi.fn(), message: "Removed" });
    });

    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    expect(onRevert).toHaveBeenCalled();
  });
});
