"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UtensilsCrossed, CalendarDays, ShoppingCart } from "lucide-react";

const tabs = [
  { href: "/recipes", label: "Recipes", icon: UtensilsCrossed },
  { href: "/meal-plan", label: "Meal Plan", icon: CalendarDays },
  { href: "/grocery-list", label: "Grocery List", icon: ShoppingCart },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t pb-[env(safe-area-inset-bottom)]">
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
      </div>
    </nav>
  );
}
