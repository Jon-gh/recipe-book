"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UtensilsCrossed, ClipboardList, CalendarDays, ShoppingCart, Settings } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Cocotte from "./cocotte/Cocotte";

export default function SideNav() {
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
    <nav
      aria-label="Main navigation"
      className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-60 bg-background border-r border-border z-20"
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 pt-6 pb-4">
        <Cocotte pose="wave" size={36} label="" />
        <span className="font-bold text-base tracking-tight">Recipe Book</span>
      </div>

      {/* Nav links */}
      <div className="flex-1 flex flex-col gap-1 px-3 mt-2">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <Icon size={18} strokeWidth={active ? 2.5 : 1.5} />
              {label}
            </Link>
          );
        })}
      </div>

      {/* Settings / user at the bottom */}
      <div className="px-3 pb-6">
        <Link
          href="/settings"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            pathname.startsWith("/settings")
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
          aria-current={pathname.startsWith("/settings") ? "page" : undefined}
        >
          {session?.user?.image ? (
            <Image
              src={session.user.image}
              alt=""
              width={20}
              height={20}
              className="rounded-full shrink-0"
            />
          ) : (
            <Settings size={18} strokeWidth={pathname.startsWith("/settings") ? 2.5 : 1.5} />
          )}
          <span className="truncate">
            {session?.user?.name?.split(" ")[0] ?? t("signOut")}
          </span>
        </Link>
      </div>
    </nav>
  );
}
