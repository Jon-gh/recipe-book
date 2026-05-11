"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { UtensilsCrossed, ClipboardList, CalendarDays, ShoppingCart, LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import Image from "next/image";

const tabs = [
  { href: "/recipes", label: "Recipes", icon: UtensilsCrossed },
  { href: "/meal-plan", label: "Plan", icon: ClipboardList },
  { href: "/schedule", label: "Schedule", icon: CalendarDays },
  { href: "/grocery-list", label: "Grocery", icon: ShoppingCart },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = authClient.useSession();

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

        <button
          onClick={() =>
            authClient.signOut({
              fetchOptions: { onSuccess: () => router.push("/auth/signin") },
            })
          }
          className="flex flex-1 flex-col items-center justify-center gap-1 text-xs text-muted-foreground active:opacity-70"
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
            <LogOut size={22} strokeWidth={1.5} />
          )}
          <span>{session?.user?.name?.split(" ")[0] ?? "Sign out"}</span>
        </button>
      </div>
    </nav>
  );
}
