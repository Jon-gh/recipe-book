import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { isValidLocale } from "@/i18n/config";
import { translateRecipe, translateMissingProducts } from "@/lib/translate";

export const dynamic = "force-dynamic";

const ingredientsInclude = { ingredients: { include: { product: true } } } as const;

type IngredientInput = {
  name: string;
  category?: string;
  quantity: number;
  unit: string;
  preparation: string;
  displayName?: string;
};

type TranslationFields = { name: string; instructions: string; notes: string; tags: string[] };

function getLocale(req: NextRequest): string {
  const locale = req.headers.get("x-user-locale") ?? "en";
  return isValidLocale(locale) ? locale : "en";
}

function mergeTranslation<T extends TranslationFields>(recipe: T, t: TranslationFields | null): T {
  if (!t) return recipe;
  return { ...recipe, name: t.name, instructions: t.instructions, notes: t.notes, tags: t.tags };
}

async function resolveProductId(
  name: string,
  category: string,
  displayName?: string,
  nativeLocale?: string
): Promise<number> {
  const existing = await prisma.product.findFirst({
    where: { name: { equals: name, mode: "insensitive" }, userId: null },
  });

  let productId: number;
  if (existing) {
    productId = existing.id;
  } else {
    const created = await prisma.product.create({ data: { name, category } });
    productId = created.id;
  }

  if (displayName && nativeLocale && nativeLocale !== "en") {
    await prisma.productTranslation
      .upsert({
        where: { productId_locale: { productId, locale: nativeLocale } },
        create: { productId, locale: nativeLocale, name: displayName },
        update: { name: displayName },
      })
      .catch(() => {});
  }

  return productId;
}

async function buildIngredientCreates(ingredients: IngredientInput[], nativeLocale: string) {
  return Promise.all(
    ingredients.map(async ({ name, category = "other", quantity, unit, preparation, displayName }) => ({
      productId: await resolveProductId(name, category, displayName, nativeLocale),
      quantity,
      unit,
      preparation,
    }))
  );
}

// Apply locale to a recipe: merge existing translation, enrich with product display names.
// Calls DeepL if no translation exists yet.
async function applyLocale<T extends TranslationFields & { id: string; nativeLocale: string; translations?: TranslationFields[]; ingredients: { productId: number; product: { id: number; name: string; category: string; source: string; defaultUnit: string; defaultQuantity: number } }[] }>(
  recipe: T,
  locale: string
): Promise<T> {
  // Merge recipe-level translation
  let translation: TranslationFields | null = recipe.translations?.[0] ?? null;
  if (!translation && recipe.nativeLocale !== locale) {
    try {
      translation = await translateRecipe(recipe, locale);
    } catch {
      // fallback: return native content
    }
  }
  const merged = mergeTranslation(recipe, translation);

  // Enrich ingredient product display names
  const productIds = recipe.ingredients.map((i) => i.productId);
  try {
    await translateMissingProducts(productIds, locale);
  } catch {
    // non-fatal: display English names as fallback
  }

  const productTranslations = await prisma.productTranslation.findMany({
    where: { productId: { in: productIds }, locale },
  });
  const nameMap = new Map(productTranslations.map((t) => [t.productId, t.name]));

  return {
    ...merged,
    ingredients: merged.ingredients.map((i) => ({
      ...i,
      product: { ...i.product, displayName: nameMap.get(i.productId) },
    })),
  } as T;
}

export async function GET(req: NextRequest) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q");
  const favourite = searchParams.get("favourite");
  const locale = getLocale(req);

  const includeTranslations = locale !== "en" ? { translations: { where: { locale } } } : {};

  const recipes = await prisma.recipe.findMany({
    where: {
      userId,
      ...(q && {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { tags: { has: q } },
          { ingredients: { some: { product: { name: { contains: q, mode: "insensitive" } } } } },
        ],
      }),
      ...(favourite === "true" && { favourite: true }),
    },
    include: { ...ingredientsInclude, ...includeTranslations },
    orderBy: { createdAt: "desc" },
  });

  // Fast path: all English
  if (locale === "en" && recipes.every((r) => r.nativeLocale === "en")) {
    return NextResponse.json(recipes);
  }

  const results = await Promise.all(recipes.map((r) => applyLocale(r, locale)));
  return NextResponse.json(results);
}

export async function POST(req: NextRequest) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;
  const locale = getLocale(req);

  const body = await req.json();
  const { ingredients, ...recipeData } = body;

  // nativeLocale from AI import body, or default to user's current locale for manual entry
  const nativeLocale: string = recipeData.nativeLocale ?? locale;

  const ingredientCreates = await buildIngredientCreates(ingredients ?? [], nativeLocale);

  const recipe = await prisma.recipe.create({
    data: { ...recipeData, nativeLocale, userId, ingredients: { create: ingredientCreates } },
    include: ingredientsInclude,
  });

  // Eagerly translate to user locale if recipe is in a different language
  if (nativeLocale !== locale) {
    try {
      await translateRecipe(recipe, locale);
      const productIds = recipe.ingredients.map((i) => i.productId);
      await translateMissingProducts(productIds, locale);
    } catch {
      // non-fatal: translation can be retried on next GET
    }
  }

  return NextResponse.json(recipe, { status: 201 });
}
