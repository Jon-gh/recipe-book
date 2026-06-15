import type { Metadata, Viewport } from "next";
import "./globals.css";
import { cn } from "@/lib/utils";
import BottomNav from "@/components/BottomNav";
import SideNav from "@/components/SideNav";
import Providers from "@/components/Providers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfbf8" },
    { media: "(prefers-color-scheme: dark)",  color: "#0e0d0c" },
  ],
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Recipe Book",
  description: "Manage your recipes, meal plans, and grocery lists",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Recipe Book",
    startupImage: "/splash.png",
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
  formatDetection: { telephone: false },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className={cn("font-sans")}>
      <body className="antialiased bg-background text-foreground min-h-screen">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>
            <SideNav />
            <main className="max-w-5xl mx-auto px-4 py-6 pb-[calc(4rem+env(safe-area-inset-bottom))] lg:ml-60 lg:pb-6">
              {children}
            </main>
            <BottomNav />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
