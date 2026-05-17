import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

const client = new Anthropic();

const SUPPORTED_LOCALES = new Set(["en", "fr", "es", "zh-CN"]);

const LOCALE_NAME: Record<string, string> = {
  en: "English",
  fr: "French",
  es: "Spanish",
  "zh-CN": "Simplified Chinese",
};

async function claudeTranslate(texts: string[], targetLocale: string): Promise<string[]> {
  const langName = LOCALE_NAME[targetLocale];
  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `Translate the following JSON array of strings to ${langName}. Return ONLY a valid JSON array of translated strings in the same order, no markdown, no extra text.\n\n${JSON.stringify(texts)}`,
      },
    ],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text.trim() : "[]";
  return JSON.parse(raw) as string[];
}

export async function translateRecipe(
  recipe: { id: string; name: string; instructions: string; notes: string; tags: string[] },
  targetLocale: string
) {
  if (!SUPPORTED_LOCALES.has(targetLocale)) return null;

  const { id, name, instructions, notes, tags } = recipe;
  const texts = [name, instructions, notes, ...tags];
  const translated = await claudeTranslate(texts, targetLocale);

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
  if (!SUPPORTED_LOCALES.has(targetLocale)) return null;

  const [name] = await claudeTranslate([product.name], targetLocale);

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
  if (!SUPPORTED_LOCALES.has(targetLocale) || !productIds.length) return;

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

  const names = await claudeTranslate(
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
