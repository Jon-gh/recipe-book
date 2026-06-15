// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import OfflineBanner from "@/components/OfflineBanner";

describe("OfflineBanner", () => {
  const listeners: Record<string, EventListener[]> = {};

  beforeEach(() => {
    listeners.online = [];
    listeners.offline = [];
    vi.spyOn(window, "addEventListener").mockImplementation(
      (type: string, handler: EventListenerOrEventListenerObject) => {
        if (type === "online" || type === "offline") {
          listeners[type].push(handler as EventListener);
        }
      }
    );
    vi.spyOn(window, "removeEventListener").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function triggerOnline() {
    listeners.online.forEach((fn) => act(() => fn(new Event("online"))));
  }
  function triggerOffline() {
    listeners.offline.forEach((fn) => act(() => fn(new Event("offline"))));
  }

  it("renders nothing when online", () => {
    Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
    render(<OfflineBanner />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows banner when offline", () => {
    Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
    render(<OfflineBanner />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText(/offline/i)).toBeInTheDocument();
  });

  it("shows banner after offline event fires", () => {
    Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
    render(<OfflineBanner />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    triggerOffline();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("hides banner after online event fires", () => {
    Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
    render(<OfflineBanner />);
    expect(screen.getByRole("status")).toBeInTheDocument();

    triggerOnline();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("has aria-live polite for screen readers", () => {
    Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
    render(<OfflineBanner />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
  });
});
