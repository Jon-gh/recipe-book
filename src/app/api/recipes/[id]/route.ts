import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ingredientsInclude = { ingredients: { include: { ingredient: true } } } as const;

type IngredientInput = { name: string; category?: string; quantity: number; unit: string; preparation: string };

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

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const recipe = await prisma.recipe.findUnique({
    where: { id: params.id },
    include: ingredientsInclude,
  });

  if (!recipe) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(recipe);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { ingredients, ...recipeData } = body;

  const ingredientCreates = ingredients ? await buildIngredientCreates(ingredients) : undefined;

  const recipe = await prisma.recipe.update({
    where: { id: params.id },
    data: {
      ...recipeData,
      ...(ingredientCreates && {
        ingredients: {
          deleteMany: {},
          create: ingredientCreates,
        },
      }),
    },
    include: ingredientsInclude,
  });

  return NextResponse.json(recipe);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.recipe.delete({ where: { id: params.id } });
  return new NextResponse(null, { status: 204 });
}
