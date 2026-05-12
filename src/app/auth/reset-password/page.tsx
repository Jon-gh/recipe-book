"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { useTranslations } from "next-intl";

export default function ResetPasswordPage() {
  const t = useTranslations("resetPassword");
  const tAuth = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: err } = await authClient.requestPasswordReset({
      email: email.trim(),
      redirectTo: "/auth/reset-password/confirm",
    });
    if (err) {
      setError(err.message ?? tAuth("somethingWentWrong"));
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-8">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">
          {t("subtitle")}
        </p>
      </div>

      <div className="w-full max-w-sm space-y-4">
        {sent ? (
          <div className="text-center space-y-2 py-4">
            <p className="font-medium">{t("checkEmail")}</p>
            <p className="text-sm text-muted-foreground">
              {t("checkEmailMessage", { email })}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              type="email"
              placeholder={tAuth("emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t("sending") : t("sendResetLink")}
            </Button>
          </form>
        )}

        <div className="text-center">
          <Link
            href="/auth/signin"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("backToSignIn")}
          </Link>
        </div>
      </div>
    </div>
  );
}
