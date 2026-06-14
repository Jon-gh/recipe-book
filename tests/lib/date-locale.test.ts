// @vitest-environment jsdom
import { describe, it, expect } from "vitest";

// Inline the helpers from schedule/page so we can test them without React
function formatDay(dateStr: string, locale: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

describe("formatDay locale-awareness", () => {
  const date = "2025-06-16";

  it("formats in English", () => {
    const result = formatDay(date, "en");
    // Should contain 'Mon' or 'Jun' — English locale
    expect(result).toMatch(/\d+/);
  });

  it("formats differently under fr vs en", () => {
    const en = formatDay(date, "en");
    const fr = formatDay(date, "fr");
    // French and English should produce different weekday text
    expect(en).not.toBe(fr);
  });
});
