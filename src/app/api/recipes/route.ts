import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const name = searchParams.get("name");
  const tag = searchParams.get("tag");
  const ingredient = searchParams.get("ingredient");
  const favourite = searchParams.get("favourite");

  const recipes = await prisma.recipe.findMany({
    where: {
      ...(name && { name: { contains: name, mode: "insensitive" } }),
      ...(tag && { tags: { has: tag } }),
      ...(ingredient && {
        ingredients: { some: { name: { contains: ingredient, mode: "insensitive" } } },
      }),
      ...(favourite === "true" && { favourite: true }),
    },
    include: { ingredients: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(recipes);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { ingredients, ...recipeData } = body;

  const recipe = await prisma.recipe.create({
    data: {
      ...recipeData,
      ingredients: { create: ingredients ?? [] },
    },
    include: { ingredients: true },
  });

  return NextResponse.json(recipe, { status: 201 });
}
