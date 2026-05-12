import "@testing-library/jest-dom";
import { vi } from "vitest";
import messages from "../messages/en.json";

function resolveMessage(namespace: string | undefined, key: string, params?: Record<string, unknown>): string {
  let raw: string;
  if (namespace) {
    const section = (messages as Record<string, Record<string, string>>)[namespace];
    raw = (section?.[key] ?? key) as string;
  } else if (key.includes(".")) {
    // Support dotted keys like "auth.noAccount" when no namespace
    const dotIdx = key.indexOf(".");
    const ns = key.slice(0, dotIdx);
    const k = key.slice(dotIdx + 1);
    const section = (messages as Record<string, Record<string, string>>)[ns];
    raw = (section?.[k] ?? key) as string;
  } else {
    raw = ((messages as unknown as Record<string, string>)?.[key] ?? key) as string;
  }
  if (!params) return raw;
  for (const [k, v] of Object.entries(params)) {
    const count = Number(v);
    // Handle ICU plural: {key, plural, one {# text} other {# text}}
    raw = raw.replace(
      new RegExp(`\\{${k},\\s*plural,\\s*(?:one\\s*\\{([^}]*)\\})?\\s*(?:other\\s*\\{([^}]*)\\})?[^}]*\\}`, "g"),
      (_, oneForm, otherForm) => {
        const form = count === 1 ? (oneForm ?? otherForm ?? "") : (otherForm ?? oneForm ?? "");
        return form.replace(/#/g, String(count));
      }
    );
    // Handle simple substitution: {key}
    raw = raw.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
  }
  return raw;
}

vi.mock("next-intl", () => ({
  useTranslations: (namespace?: string) => (key: string, params?: Record<string, unknown>) =>
    resolveMessage(namespace, key, params),
  getTranslations: async (namespace?: string) => (key: string, params?: Record<string, unknown>) =>
    resolveMessage(namespace, key, params),
  NextIntlClientProvider: ({ children }: { children: React.ReactNode }) => children,
}));
