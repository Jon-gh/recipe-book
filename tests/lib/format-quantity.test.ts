import { describe, it, expect } from "vitest";
import { formatQuantity, scaleQuantity } from "@/lib/format-quantity";

describe("formatQuantity", () => {
  it("returns whole numbers as strings", () => {
    expect(formatQuantity(1)).toBe("1");
    expect(formatQuantity(3)).toBe("3");
  });

  it("formats common fractions as unicode", () => {
    expect(formatQuantity(0.5)).toBe("½");
    expect(formatQuantity(0.25)).toBe("¼");
    expect(formatQuantity(0.75)).toBe("¾");
  });

  it("combines whole and fraction parts", () => {
    expect(formatQuantity(1.5)).toBe("1½");
    expect(formatQuantity(2.25)).toBe("2¼");
    expect(formatQuantity(3.75)).toBe("3¾");
  });

  it("rounds to nearest 0.25", () => {
    // 0.3 rounds to 0.25 → ¼
    expect(formatQuantity(0.3)).toBe("¼");
    // 0.6 rounds to 0.5 → ½
    expect(formatQuantity(0.6)).toBe("½");
    // 1.1 rounds to 1 → 1
    expect(formatQuantity(1.1)).toBe("1");
  });

  it("returns 0 for zero or negative values", () => {
    expect(formatQuantity(0)).toBe("0");
    expect(formatQuantity(-1)).toBe("0");
  });
});

describe("scaleQuantity", () => {
  it("scales proportionally", () => {
    // 2 cups for 4 servings → 1 cup for 2 servings
    expect(scaleQuantity(2, 4, 2)).toBe("1");
  });

  it("scales up", () => {
    // 1 cup for 2 servings → 2 cups for 4 servings
    expect(scaleQuantity(1, 2, 4)).toBe("2");
  });

  it("produces fraction output when scaled", () => {
    // 1 cup for 2 servings → ½ cup for 1 serving
    expect(scaleQuantity(1, 2, 1)).toBe("½");
  });

  it("returns base quantity unchanged when servings match", () => {
    expect(scaleQuantity(3, 4, 4)).toBe("3");
  });

  it("handles zero base servings gracefully", () => {
    expect(scaleQuantity(2, 0, 4)).toBe("2");
  });
});
