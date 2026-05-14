import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { isValidLocale } from "@/i18n/config";

export const dynamic = "force-dynamic";

function getLocale(req: NextRequest): string {
  const locale = req.headers.get("x-user-locale") ?? "en";
  return isValidLocale(locale) ? locale : "en";
}

export async function GET(req: NextRequest) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q");
  const source = searchParams.get("source");
  const locale = getLocale(req);

  // Build name search: for non-English locales also match ProductTranslation names
  const nameFilter = q
    ? locale !== "en"
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { translations: { some: { locale, name: { contains: q, mode: "insensitive" as const } } } },
          ],
        }
      : { name: { contains: q, mode: "insensitive" as const } }
    : {};

  const products = await prisma.product.findMany({
    where: {
      OR: [{ userId: null }, { userId }],
      ...nameFilter,
      ...(source && { source }),
    },
    include: { translations: { where: { locale }, select: { name: true } } },
    orderBy: { name: "asc" },
    take: source ? undefined : 10,
  });

  // Surface translation as displayName; drop the translations array from the response
  const result = products.map(({ translations, ...p }) => ({
    ...p,
    displayName: (translations ?? [])[0]?.name,
  }));

  return NextResponse.json(result);
}
