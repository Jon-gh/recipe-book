import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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
          { ingredients: { some: { name: { contains: q, mode: "insensitive" } } } },
        ],
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
