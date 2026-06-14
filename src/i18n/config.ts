export const SUPPORTED_LOCALES = ["en", "fr", "zh-CN", "es"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export function isValidLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  fr: "Français",
  "zh-CN": "中文",
  es: "Español",
};
