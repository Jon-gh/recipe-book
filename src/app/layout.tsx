import type { Metadata } from "next";
import "./globals.css";
import { cn } from "@/lib/utils";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Recipe Book",
  description: "Manage your recipes, meal plans, and grocery lists",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans")}>
      <body className="antialiased bg-background text-foreground min-h-screen">
        <header className="border-b bg-white sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
            <Link href="/" className="font-semibold text-lg tracking-tight">
              Recipe Book
            </Link>
            <nav className="flex gap-6 text-sm text-muted-foreground">
              <Link href="/recipes" className="hover:text-foreground transition-colors">
                Recipes
              </Link>
              <Link href="/meal-plan" className="hover:text-foreground transition-colors">
                Meal Plan
              </Link>
              <Link href="/grocery-list" className="hover:text-foreground transition-colors">
                Grocery List
              </Link>
            </nav>
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
