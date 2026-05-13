import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { isValidLocale, type Locale } from "./config";

export { SUPPORTED_LOCALES, type Locale, isValidLocale } from "./config";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const raw = cookieStore.get("NEXT_LOCALE")?.value ?? "en";
  const locale: Locale = isValidLocale(raw) ? raw : "en";

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
