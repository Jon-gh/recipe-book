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
});
