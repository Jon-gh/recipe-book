import { NextRequest, NextResponse } from "next/server";
import { extractRecipeFromImage } from "@/lib/extract-recipe";

const SUPPORTED_TYPES = {
  "image/jpeg": "image/jpeg",
  "image/png": "image/png",
  "image/gif": "image/gif",
  "image/webp": "image/webp",
} as const;

type SupportedMediaType = keyof typeof SUPPORTED_TYPES;

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("image") as File | null;

  if (!file) {
    return NextResponse.json({ error: "image file is required" }, { status: 400 });
  }

  const mediaType = file.type as SupportedMediaType;
  if (!SUPPORTED_TYPES[mediaType]) {
    return NextResponse.json(
      { error: `Unsupported image type. Supported: ${Object.keys(SUPPORTED_TYPES).join(", ")}` },
      { status: 400 }
    );
  }

  const buffer = await file.arrayBuffer();
  const base64Data = Buffer.from(buffer).toString("base64");

  const recipe = await extractRecipeFromImage(base64Data, mediaType);
  return NextResponse.json(recipe);
}
