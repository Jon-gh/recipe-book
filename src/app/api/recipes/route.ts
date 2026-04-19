import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const ingredientsInclude = { ingredients: { include: { ingredient: true } } } as const;

type IngredientInput = { name: string; category?: string; quantity: number; unit: string; preparation: string };

// Find existing Ingredient by name (case-insensitive) or create it (first-write wins for category).
async function resolveIngredientId(name: string, category: string): Promise<number> {
  const existing = await prisma.ingredient.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });
  if (existing) return existing.id;
  const created = await prisma.ingredient.create({ data: { name, category } });
  return created.id;
}

async function buildIngredientCreates(ingredients: IngredientInput[]) {
  return Promise.all(
    ingredients.map(async ({ name, category = "other", quantity, unit, preparation }) => ({
      ingredientId: await resolveIngredientId(name, category),
      quantity,
      unit,
      preparation,
    }))
  );
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q");
  const favourite = searchParams.get("favourite");

  const recipes = await prisma.recipe.findMany({
    where: {
      ...(q && {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { tags: { has: q } },
          { ingredients: { some: { ingredient: { name: { contains: q, mode: "insensitive" } } } } },
        ],
      }),
      ...(favourite === "true" && { favourite: true }),
    },
    include: ingredientsInclude,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(recipes);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { ingredients, ...recipeData } = body;

  const ingredientCreates = await buildIngredientCreates(ingredients ?? []);

  const recipe = await prisma.recipe.create({
    data: {
      ...recipeData,
      ingredients: { create: ingredientCreates },
    },
    include: ingredientsInclude,
  });

  return NextResponse.json(recipe, { status: 201 });
}
