import { describe, it, expect } from "vitest";
import { normalizeUnit } from "@/lib/grocery-list";

describe("normalizeUnit", () => {
  it("converts kg to g with factor 1000", () => {
    expect(normalizeUnit("kg")).toEqual({ canonical: "g", factor: 1000 });
  });

  it("converts l to ml with factor 1000", () => {
    expect(normalizeUnit("l")).toEqual({ canonical: "ml", factor: 1000 });
  });

  it("converts litre/litres/liter/liters to ml", () => {
    for (const u of ["litre", "litres", "liter", "liters"]) {
      expect(normalizeUnit(u).canonical).toBe("ml");
    }
  });

  it("strips leading size qualifier from multi-word unit", () => {
    expect(normalizeUnit("small bunch").canonical).toBe("bunch");
    expect(normalizeUnit("fat clove").canonical).toBe("clove");
  });

  it("normalises alias spellings", () => {
    expect(normalizeUnit("handfuls").canonical).toBe("bunch");
    expect(normalizeUnit("cloves").canonical).toBe("clove");
    expect(normalizeUnit("tablespoons").canonical).toBe("tbsp");
    expect(normalizeUnit("teaspoons").canonical).toBe("tsp");
    expect(normalizeUnit("grams").canonical).toBe("g");
  });

  it("returns unit unchanged when no match", () => {
    expect(normalizeUnit("cup").canonical).toBe("cup");
    expect(normalizeUnit("tsp").canonical).toBe("tsp");
  });

  it("is case-insensitive", () => {
    expect(normalizeUnit("KG").canonical).toBe("g");
    expect(normalizeUnit("Grams").canonical).toBe("g");
  });
});
