import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { isValidLocale } from "@/i18n/config";
import { translateRecipe, translateMissingProducts } from "@/lib/translate";

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

async function applyLocale<T extends TranslationFields & { id: string; nativeLocale: string; translations?: TranslationFields[]; ingredients: { productId: number; product: { id: number; name: string; category: string; source: string; defaultUnit: string; defaultQuantity: number } }[] }>(
  recipe: T,
  locale: string
): Promise<T> {
  let translation: TranslationFields | null = recipe.translations?.[0] ?? null;
  if (!translation && recipe.nativeLocale !== locale) {
    try {
      translation = await translateRecipe(recipe, locale);
    } catch {
      // fallback: return native content
    }
  }
  const merged = mergeTranslation(recipe, translation);

  const productIds = recipe.ingredients.map((i) => i.productId);
  try {
    await translateMissingProducts(productIds, locale);
  } catch {
    // non-fatal
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

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;
  const locale = getLocale(_req);

  const includeTranslations = locale !== "en" ? { translations: { where: { locale } } } : {};

  const recipe = await prisma.recipe.findFirst({
    where: { id: params.id, userId },
    include: { ...ingredientsInclude, ...includeTranslations },
  });

  if (!recipe) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (locale === "en" && recipe.nativeLocale === "en") {
    return NextResponse.json(recipe);
  }

  return NextResponse.json(await applyLocale(recipe, locale));
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const owned = await prisma.recipe.findFirst({ where: { id: params.id, userId } });
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { ingredients, ...recipeData } = body;

  // nativeLocale must not change on edit — keep the existing one
  const { nativeLocale: _ignored, ...safeRecipeData } = recipeData;
  const nativeLocale = owned.nativeLocale;

  const ingredientCreates = ingredients
    ? await buildIngredientCreates(ingredients, nativeLocale)
    : undefined;

  const recipe = await prisma.recipe.update({
    where: { id: params.id },
    data: {
      ...safeRecipeData,
      ...(ingredientCreates && {
        ingredients: { deleteMany: {}, create: ingredientCreates },
      }),
    },
    include: ingredientsInclude,
  });

  return NextResponse.json(recipe);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const owned = await prisma.recipe.findFirst({ where: { id: params.id, userId } });
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.recipe.delete({ where: { id: params.id } });
  return new NextResponse(null, { status: 204 });
}
