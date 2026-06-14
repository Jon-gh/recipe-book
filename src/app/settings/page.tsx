"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { useTranslations } from "next-intl";
import { SUPPORTED_LOCALES, type Locale } from "@/i18n/config";

const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  fr: "Français",
  "zh-CN": "中文",
  es: "Español",
};

export default function SettingsPage() {
  const t = useTranslations("settings");
  const tLang = useTranslations("languages");
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [locale, setLocale] = useState<Locale>("en");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/user/locale")
      .then((r) => r.json())
      .then((data) => {
        if (data.locale) setLocale(data.locale as Locale);
      })
      .catch(() => {});
  }, []);

  async function handleLocaleChange(next: Locale) {
    setLocale(next);
    setSaving(true);
    setSaved(false);
    await fetch("/api/user/locale", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: next }),
    }).catch(() => {});
    setSaving(false);
    setSaved(true);
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Link href="/recipes">
          <Button variant="ghost" size="icon" className="text-muted-foreground h-9 w-9 -ml-2">
            <ChevronLeft size={20} />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
      </div>

      <div className="space-y-6 max-w-sm">
        {session?.user && (
          <div className="space-y-0.5">
            {session.user.name && (
              <p className="text-sm font-medium">{session.user.name}</p>
            )}
            <p className="text-sm text-muted-foreground">{session.user.email}</p>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">{tLang("label")}</label>
          <select
            value={locale}
            onChange={(e) => handleLocaleChange(e.target.value as Locale)}
            disabled={saving}
            className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
          >
            {SUPPORTED_LOCALES.map((loc) => (
              <option key={loc} value={loc}>
                {LOCALE_LABELS[loc]}
              </option>
            ))}
          </select>
          {saved && <p className="text-xs text-muted-foreground">{t("saved")}</p>}
        </div>

        <Button
          variant="outline"
          className="w-full text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
          onClick={() =>
            authClient.signOut({
              fetchOptions: { onSuccess: () => router.push("/auth/signin") },
            })
          }
        >
          {t("signOut")}
        </Button>
      </div>
    </div>
  );
}
