import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const original = await prisma.recipe.findUnique({
    where: { id: params.id },
    include: { ingredients: true },
  });

  if (!original) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ingredients, ...recipeData } = original;

  const duplicate = await prisma.recipe.create({
    data: {
      ...recipeData,
      name: `${original.name} (copy)`,
      ingredients: {
        create: ingredients.map(({ id: _iid, recipeId: _rid, ...ing }) => ing),
      },
    },
    include: { ingredients: true },
  });

  return NextResponse.json(duplicate, { status: 201 });
}
