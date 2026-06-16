import { describe, it, expect } from "vitest";
import { CARD_BG_COLORS, cardBgColor } from "@/lib/card-colors";

describe("cardBgColor", () => {
  it("returns the same class for the same id every time", () => {
    const id = "clxyz123";
    expect(cardBgColor(id)).toBe(cardBgColor(id));
  });

  it("output is always a member of CARD_BG_COLORS", () => {
    const ids = ["abc", "def", "ghi", "jkl", "mno", "pqr", "stu", "vwx", "yz0", "123"];
    for (const id of ids) {
      expect(CARD_BG_COLORS).toContain(cardBgColor(id));
    }
  });

  it("distributes across all 6 palette entries for a diverse set of ids", () => {
    const ids = Array.from({ length: 60 }, (_, i) => `recipe-id-${i}`);
    const used = new Set(ids.map(cardBgColor));
    expect(used.size).toBe(CARD_BG_COLORS.length);
  });

  it("different ids can produce different colours", () => {
    const results = new Set(["recipe-a", "recipe-b", "recipe-c", "recipe-d"].map(cardBgColor));
    expect(results.size).toBeGreaterThan(1);
  });

  it("palette has 6 distinct entries", () => {
    expect(CARD_BG_COLORS).toHaveLength(6);
    expect(new Set(CARD_BG_COLORS).size).toBe(6);
  });

  it("uses a visible tint shade, never the near-white -50 step", () => {
    // -50 is almost indistinguishable from white in light mode; the palette
    // must use a stronger step so cards read as distinctly coloured.
    for (const cls of CARD_BG_COLORS) {
      expect(cls).not.toMatch(/-50\b/);
    }
  });
});
