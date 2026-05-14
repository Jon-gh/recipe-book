import { prisma } from "@/lib/prisma";

// Maps app locale → DeepL target_lang code.
// English is a valid target when a recipe's nativeLocale is not English.
const DEEPL_LANG: Record<string, string> = {
  en: "EN",
  fr: "FR",
  es: "ES",
  "zh-CN": "ZH",
};

async function deeplTranslate(texts: string[], targetLocale: string): Promise<string[]> {
  const targetLang = DEEPL_LANG[targetLocale];
  if (!targetLang || !process.env.DEEPL_API_KEY) return texts;

  const res = await fetch("https://api-free.deepl.com/v2/translate", {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${process.env.DEEPL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: texts, target_lang: targetLang }),
  });

  if (!res.ok) throw new Error(`DeepL error ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { translations: { text: string }[] };
  return data.translations.map((t) => t.text);
}

export async function translateRecipe(
  recipe: { id: string; name: string; instructions: string; notes: string; tags: string[] },
  targetLocale: string
) {
  if (!DEEPL_LANG[targetLocale] || !process.env.DEEPL_API_KEY) return null;

  const { id, name, instructions, notes, tags } = recipe;
  const texts = [name, instructions, notes, ...tags];
  const translated = await deeplTranslate(texts, targetLocale);

  const data = {
    name: translated[0],
    instructions: translated[1],
    notes: translated[2],
    tags: translated.slice(3),
  };

  return prisma.recipeTranslation.upsert({
    where: { recipeId_locale: { recipeId: id, locale: targetLocale } },
    create: { recipeId: id, locale: targetLocale, ...data },
    update: data,
  });
}

export async function translateProduct(
  product: { id: number; name: string },
  targetLocale: string
) {
  if (!DEEPL_LANG[targetLocale] || !process.env.DEEPL_API_KEY) return null;

  const [name] = await deeplTranslate([product.name], targetLocale);

  return prisma.productTranslation.upsert({
    where: { productId_locale: { productId: product.id, locale: targetLocale } },
    create: { productId: product.id, locale: targetLocale, name },
    update: { name },
  });
}

// Batch-translate any products in productIds that don't yet have a translation
// for targetLocale. Product names are always translated from English (canonical).
export async function translateMissingProducts(
  productIds: number[],
  targetLocale: string
): Promise<void> {
  if (!DEEPL_LANG[targetLocale] || !process.env.DEEPL_API_KEY || !productIds.length) return;

  const existing = await prisma.productTranslation.findMany({
    where: { productId: { in: productIds }, locale: targetLocale },
    select: { productId: true },
  });
  const done = new Set(existing.map((t) => t.productId));
  const missing = productIds.filter((id) => !done.has(id));
  if (!missing.length) return;

  const products = await prisma.product.findMany({
    where: { id: { in: missing } },
    select: { id: true, name: true },
  });
  if (!products.length) return;

  const names = await deeplTranslate(
    products.map((p) => p.name),
    targetLocale
  );

  await prisma.$transaction(
    products.map((p, i) =>
      prisma.productTranslation.upsert({
        where: { productId_locale: { productId: p.id, locale: targetLocale } },
        create: { productId: p.id, locale: targetLocale, name: names[i] },
        update: { name: names[i] },
      })
    )
  );
}
