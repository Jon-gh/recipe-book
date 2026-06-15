"use client";

import { useOnlineStatus } from "@/lib/use-online-status";
import { WifiOff } from "lucide-react";
import { useTranslations } from "next-intl";

export default function OfflineBanner() {
  const online = useOnlineStatus();
  const t = useTranslations("offline");

  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 bg-foreground text-background text-sm font-medium py-2 px-4"
    >
      <WifiOff size={15} aria-hidden="true" />
      <span>{t("banner")}</span>
    </div>
  );
}
