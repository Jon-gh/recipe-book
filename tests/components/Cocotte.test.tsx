// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Cocotte from "@/components/cocotte/Cocotte";

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
