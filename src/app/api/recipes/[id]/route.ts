import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";

const ingredientsInclude = { ingredients: { include: { product: true } } } as const;

type IngredientInput = { name: string; category?: string; quantity: number; unit: string; preparation: string };

async function resolveProductId(name: string, category: string): Promise<number> {
  const existing = await prisma.product.findFirst({
    where: { name: { equals: name, mode: "insensitive" }, userId: null },
  });
  if (existing) return existing.id;
  const created = await prisma.product.create({ data: { name, category } });
  return created.id;
}

async function buildIngredientCreates(ingredients: IngredientInput[]) {
  return Promise.all(
    ingredients.map(async ({ name, category = "other", quantity, unit, preparation }) => ({
      productId: await resolveProductId(name, category),
      quantity,
      unit,
      preparation,
    }))
  );
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const recipe = await prisma.recipe.findFirst({
    where: { id: params.id, userId },
    include: ingredientsInclude,
  });

  if (!recipe) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(recipe);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const owned = await prisma.recipe.findFirst({ where: { id: params.id, userId } });
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

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
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const owned = await prisma.recipe.findFirst({ where: { id: params.id, userId } });
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.recipe.delete({ where: { id: params.id } });
  return new NextResponse(null, { status: 204 });
}
