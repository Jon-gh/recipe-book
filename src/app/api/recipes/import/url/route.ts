import { NextRequest, NextResponse } from "next/server";
import { extractRecipeFromText } from "@/lib/extract-recipe";
import { tryJsonLd, stripHtml } from "@/lib/url-import";

export async function POST(req: NextRequest) {
  const { url } = await req.json();

  if (!url?.trim()) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  let html: string;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; RecipeBook/1.0)" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    html = await res.text();
  } catch (err) {
    return NextResponse.json({ error: `Failed to fetch URL: ${err}` }, { status: 400 });
  }

  const jsonldRecipe = tryJsonLd(html);
  if (jsonldRecipe) return NextResponse.json(jsonldRecipe);

  const text = stripHtml(html);
  if (!text.trim()) {
    return NextResponse.json({ error: "Could not extract text from page" }, { status: 422 });
  }

  const recipe = await extractRecipeFromText(text);
  return NextResponse.json(recipe);
}
