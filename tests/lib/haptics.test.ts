import { describe, it, expect, vi, beforeEach } from "vitest";
import { haptic } from "@/lib/haptics";

describe("haptic", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "vibrate", {
      value: vi.fn(),
      configurable: true,
      writable: true,
    });
  });

  it("calls navigator.vibrate with default 10ms pattern", () => {
    haptic();
    expect(navigator.vibrate).toHaveBeenCalledWith(10);
  });

  it("calls navigator.vibrate with a custom pattern", () => {
    haptic([10, 50, 10]);
    expect(navigator.vibrate).toHaveBeenCalledWith([10, 50, 10]);
  });

  it("does not throw when navigator.vibrate is unavailable", () => {
    Object.defineProperty(navigator, "vibrate", {
      value: undefined,
      configurable: true,
      writable: true,
    });
    expect(() => haptic()).not.toThrow();
  });
});
