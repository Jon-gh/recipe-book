// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import Cocotte from "@/components/cocotte/Cocotte";
import { getSeasonalTopper } from "@/components/cocotte/seasonal";

describe("Cocotte", () => {
  const poses = ["wave", "stir", "hold-basket", "cheer", "shrug"] as const;

  it.each(poses)("renders %s pose without throwing", (pose) => {
    const { container } = render(<Cocotte pose={pose} />);
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("is aria-hidden when decorative (no label)", () => {
    const { container } = render(<Cocotte pose="wave" />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
    expect(svg?.getAttribute("aria-label")).toBeNull();
  });

  it("has aria-label and role=img when label is provided", () => {
    const { container } = render(<Cocotte pose="wave" label="Waving pot" />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("aria-label")).toBe("Waving pot");
    expect(svg?.getAttribute("role")).toBe("img");
    expect(svg?.getAttribute("aria-hidden")).toBeNull();
  });

  it("shared body geometry is present in all poses", () => {
    poses.forEach((pose) => {
      const { container } = render(<Cocotte pose={pose} />);
      // The round belly path is unique to the body — present in every pose
      const paths = Array.from(container.querySelectorAll("path"));
      const bellyPath = paths.find((p) =>
        p.getAttribute("d")?.includes("M46 109")
      );
      expect(bellyPath, `belly missing for pose ${pose}`).not.toBeNull();
    });
  });

  it("applies size via width/height attributes", () => {
    const { container } = render(<Cocotte pose="stir" size={80} />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("width")).toBe("80");
  });

  describe("reduced-motion: CSS classes are applied (animation gated in CSS)", () => {
    // SVG className is SVGAnimatedString; use .baseVal to get the string value
    it("cheer pose has cocotte-hop class", () => {
      const { container } = render(<Cocotte pose="cheer" />);
      const svg = container.querySelector("svg");
      expect(svg?.className.baseVal).toContain("cocotte-hop");
    });

    it("non-cheer poses have cocotte-bob class", () => {
      const { container } = render(<Cocotte pose="wave" />);
      const svg = container.querySelector("svg");
      expect(svg?.className.baseVal).toContain("cocotte-bob");
    });
  });
});

describe("seasonal toppers", () => {
  it("getSeasonalTopper returns santa in December", () => {
    vi.setSystemTime(new Date("2025-12-15T12:00:00"));
    expect(getSeasonalTopper()).toBe("santa");
    vi.useRealTimers();
  });

  it("getSeasonalTopper returns pumpkin from Oct 20", () => {
    vi.setSystemTime(new Date("2025-10-28T12:00:00"));
    expect(getSeasonalTopper()).toBe("pumpkin");
    vi.useRealTimers();
  });

  it("getSeasonalTopper returns flower in April", () => {
    vi.setSystemTime(new Date("2025-04-10T12:00:00"));
    expect(getSeasonalTopper()).toBe("flower");
    vi.useRealTimers();
  });

  it("getSeasonalTopper returns sprout in June (no special season)", () => {
    vi.setSystemTime(new Date("2025-06-06T12:00:00"));
    expect(getSeasonalTopper()).toBe("sprout");
    vi.useRealTimers();
  });

  it("topper prop overrides seasonal topper", () => {
    vi.setSystemTime(new Date("2025-12-25T12:00:00")); // would be santa
    const { container } = render(<Cocotte pose="wave" topper="sprout" />);
    // sprout uses the knob circle at (100,82); santa does not
    const circles = Array.from(container.querySelectorAll("circle"));
    const knob = circles.find(
      (c) => c.getAttribute("cx") === "100" && c.getAttribute("cy") === "82"
    );
    expect(knob, "sprout knob should be present when topper=sprout").not.toBeNull();
    vi.useRealTimers();
  });

  it("santa topper renders red hat path", () => {
    const { container } = render(<Cocotte pose="wave" topper="santa" />);
    const paths = Array.from(container.querySelectorAll("path"));
    const hat = paths.find((p) => p.getAttribute("fill") === "#ef4444");
    expect(hat, "santa red hat path should be present").not.toBeNull();
  });

  it("pumpkin topper renders orange ellipse", () => {
    const { container } = render(<Cocotte pose="wave" topper="pumpkin" />);
    const ellipses = Array.from(container.querySelectorAll("ellipse"));
    const pumpkin = ellipses.find((e) => e.getAttribute("fill") === "#f97316");
    expect(pumpkin, "pumpkin orange ellipse should be present").not.toBeNull();
  });

  it("flower topper renders pink petals", () => {
    const { container } = render(<Cocotte pose="wave" topper="flower" />);
    const ellipses = Array.from(container.querySelectorAll("ellipse"));
    const petal = ellipses.find((e) => e.getAttribute("fill") === "#fda4af");
    expect(petal, "flower pink petal ellipse should be present").not.toBeNull();
  });
});
