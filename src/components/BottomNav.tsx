"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UtensilsCrossed, ClipboardList, CalendarDays, ShoppingCart, Settings } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useTranslations } from "next-intl";
import Image from "next/image";

export default function BottomNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  const { data: session } = authClient.useSession();

  if (pathname.startsWith("/auth")) return null;

  const tabs = [
    { href: "/recipes", label: t("recipes"), icon: UtensilsCrossed },
    { href: "/meal-plan", label: t("plan"), icon: ClipboardList },
    { href: "/schedule", label: t("schedule"), icon: CalendarDays },
    { href: "/grocery-list", label: t("grocery"), icon: ShoppingCart },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 bg-stone-50 border-t border-stone-200 dark:bg-stone-900 dark:border-stone-700 pb-[env(safe-area-inset-bottom)]">
      <div className="flex h-16">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center justify-center gap-1 text-xs transition-colors active:opacity-70 ${
                active ? "text-green-600" : "text-muted-foreground"
              }`}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 1.5} />
              <span>{label}</span>
            </Link>
          );
        })}

        <Link
          href="/settings"
          className={`flex flex-1 flex-col items-center justify-center gap-1 text-xs transition-colors active:opacity-70 ${
            pathname.startsWith("/settings") ? "text-green-600" : "text-muted-foreground"
          }`}
        >
          {session?.user?.image ? (
            <Image
              src={session.user.image}
              alt=""
              width={24}
              height={24}
              className="rounded-full"
            />
          ) : (
            <Settings size={22} strokeWidth={pathname.startsWith("/settings") ? 2.5 : 1.5} />
          )}
          <span>{session?.user?.name?.split(" ")[0] ?? t("signOut")}</span>
        </Link>
      </div>
    </nav>
  );
}
