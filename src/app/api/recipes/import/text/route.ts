import { NextRequest, NextResponse } from "next/server";
import { extractRecipeFromText } from "@/lib/extract-recipe";

export async function POST(req: NextRequest) {
  const { text } = await req.json();

  if (!text?.trim()) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const recipe = await extractRecipeFromText(text);
  return NextResponse.json(recipe);
}
