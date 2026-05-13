import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SUPPORTED_LOCALES, isValidLocale } from "@/i18n/config";

const COOKIE_OPTIONS = {
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
  sameSite: "lax" as const,
  httpOnly: false,
};

export async function GET() {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { locale: true },
  });
  const locale = user?.locale ?? "en";

  const res = NextResponse.json({ locale });
  res.cookies.set("NEXT_LOCALE", locale, COOKIE_OPTIONS);
  return res;
}

export async function PATCH(request: Request) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => ({}));
  const { locale } = body;

  if (!locale || !isValidLocale(locale)) {
    return NextResponse.json(
      { error: `Invalid locale. Supported: ${SUPPORTED_LOCALES.join(", ")}` },
      { status: 400 }
    );
  }

  await prisma.user.update({
    where: { id: auth.userId },
    data: { locale },
  });

  const res = NextResponse.json({ locale });
  res.cookies.set("NEXT_LOCALE", locale, COOKIE_OPTIONS);
  return res;
}
