"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { useTranslations } from "next-intl";
import { SUPPORTED_LOCALES, type Locale } from "@/i18n/config";

type Mode = "signin" | "signup";

const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  fr: "Français",
  "zh-CN": "中文",
  es: "Español",
};

export default function SignInPage() {
  const t = useTranslations();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [locale, setLocale] = useState<Locale>("en");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function syncLocale(target: Locale) {
    await fetch("/api/user/locale", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: target }),
    }).catch(() => {});
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        const { error: err } = await authClient.signUp.email({
          email: email.trim(),
          password,
          name: name.trim() || email.trim().split("@")[0],
        });
        if (err) {
          setError(err.message ?? t("auth.signupFailed"));
        } else {
          await syncLocale(locale);
          router.push("/recipes");
        }
      } else {
        const { error: err } = await authClient.signIn.email({
          email: email.trim(),
          password,
        });
        if (err) {
          setError(err.message ?? t("auth.invalidCredentials"));
        } else {
          // Sync locale cookie from DB then navigate
          await fetch("/api/user/locale").catch(() => {});
          router.push("/recipes");
        }
      }
    } catch {
      setError(t("auth.somethingWentWrong"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-8">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold">{t("auth.appTitle")}</h1>
        <p className="text-muted-foreground text-sm">
          {mode === "signin" ? t("auth.signinSubtitle") : t("auth.signupSubtitle")}
        </p>
      </div>

      <div className="w-full max-w-sm space-y-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "signup" && (
            <Input
              type="text"
              placeholder={t("auth.namePlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          )}
          <Input
            type="email"
            placeholder={t("auth.emailPlaceholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <Input
            type="password"
            placeholder={t("auth.passwordPlaceholder")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
          />

          {mode === "signup" && (
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">
                {t("languages.label")}
              </label>
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value as Locale)}
                className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
              >
                {SUPPORTED_LOCALES.map((loc) => (
                  <option key={loc} value={loc}>
                    {LOCALE_LABELS[loc]}
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading
              ? mode === "signin"
                ? t("auth.signingIn")
                : t("auth.creatingAccount")
              : mode === "signin"
              ? t("auth.signin")
              : t("auth.createAccount")}
          </Button>
        </form>

        <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
          {mode === "signin" ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError(null);
                }}
                className="hover:text-foreground transition-colors"
              >
                {t("auth.noAccount")}
              </button>
              <Link
                href="/auth/reset-password"
                className="hover:text-foreground transition-colors"
              >
                {t("auth.forgotPassword")}
              </Link>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setError(null);
              }}
              className="hover:text-foreground transition-colors"
            >
              {t("auth.alreadyHaveAccount")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
