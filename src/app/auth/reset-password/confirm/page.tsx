"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { useTranslations } from "next-intl";

function ConfirmForm() {
  const t = useTranslations("resetPassword");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: err } = await authClient.resetPassword({
      newPassword: password,
      token,
    });
    if (err) {
      setError(err.message ?? t("resetFailed"));
    } else {
      router.push("/auth/signin");
    }
    setLoading(false);
  }

  if (!token) {
    return (
      <p className="text-sm text-destructive text-center">
        {t("invalidLink")}{" "}
        <Link href="/auth/reset-password" className="underline">
          {t("requestNewLink")}
        </Link>
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Input
        type="password"
        placeholder={t("newPasswordPlaceholder")}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        autoComplete="new-password"
        minLength={8}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? tCommon("saving") : t("setNewPassword")}
      </Button>
    </form>
  );
}

export default function ResetPasswordConfirmPage() {
  const t = useTranslations("resetPassword");
  const tCommon = useTranslations("common");
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-8">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold">{t("confirmTitle")}</h1>
        <p className="text-muted-foreground text-sm">{t("confirmSubtitle")}</p>
      </div>
      <div className="w-full max-w-sm">
        <Suspense fallback={<p className="text-center text-muted-foreground text-sm">{tCommon("loading")}</p>}>
          <ConfirmForm />
        </Suspense>
      </div>
    </div>
  );
}
