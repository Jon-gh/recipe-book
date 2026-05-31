import Anthropic from "@anthropic-ai/sdk";

const EXTRACTION_PROMPT = `You are a recipe extraction assistant. Extract all recipe information from the provided input.

First, detect the language of the input. Then return ONLY a valid JSON object with this exact structure — no markdown, no extra text:
{
  "nativeLocale": "fr",
  "name": "Boeuf bourguignon",
  "servings": 4,
  "ingredients": [
    {"name": "beef chuck", "displayName": "boeuf braisé", "quantity": 500.0, "unit": "g", "preparation": "coupé en cubes", "category": "meat & fish"},
    {"name": "red wine", "displayName": "vin rouge", "quantity": 750.0, "unit": "ml", "preparation": "", "category": "drinks"},
    {"name": "bay leaf", "displayName": "feuille de laurier", "quantity": 2.0, "unit": "", "preparation": "", "category": "spices & herbs"}
  ],
  "instructions": "Étape 1: ...\\n\\nÉtape 2: ...\\n\\nÉtape 3: ...",
  "tags": ["français", "bœuf", "mijoté"]
}

Rules:
- nativeLocale must be the IETF language tag of the detected input language: "en", "fr", "es", or "zh-CN"; use "en" as fallback for unsupported languages
- name, instructions, notes, and tags must be written in the detected language (nativeLocale)
- ingredient name must ALWAYS be in English — it is the canonical lookup key used across all users
- ingredient displayName must be the ingredient name in the detected language; omit displayName (or use "") when nativeLocale is "en"
- servings must be a positive integer
- quantity must be a positive number
- unit must be a string; use "" when no unit applies (e.g. 2 eggs → unit "")
- unit must use standard abbreviated forms: "g" not "grams", "kg" not "kilograms", "ml" not "millilitres", "l" not "litre", "tbsp" not "tablespoon", "tsp" not "teaspoon"
- Do not include size qualifiers (fat, small, large, big) in the unit field — e.g. "2 fat cloves garlic" → quantity 2, unit "clove", name "garlic"
- ingredient name must be the pure ingredient only — no preparation details and no size qualifiers
- preparation describes how to prepare the ingredient in the native language; use "" if none
- instructions must be double-newline-separated steps (use "\\n\\n" between each step, never single "\\n")
- tags must be a list of 1-5 lowercase category keywords in the native language
- category must be exactly one of: "fruit & veg", "meat & fish", "dairy & eggs", "bakery", "frozen", "drinks", "grains & pulses", "canned & jarred", "nuts & seeds", "baking & sweeteners", "condiments & sauces", "spices & herbs", "personal care", "household & cleaning", "health & pharmacy", "pet care", "other"
- Omit water and other universally available household basics (e.g. tap water, ice) from the ingredients list
- If a detail is unclear, make a reasonable culinary estimate

Return only the JSON object, nothing else.`;

const client = new Anthropic();

function parseModelResponse(raw: string): object {
  let text = raw.trim();
  if (text.startsWith("```")) {
    const lines = text.split("\n");
    const end = lines[lines.length - 1].trim().startsWith("```") ? -1 : undefined;
    text = lines.slice(1, end).join("\n").trim();
  }
  return JSON.parse(text);
}

export async function extractRecipeFromText(text: string): Promise<object> {
  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2048,
    messages: [{ role: "user", content: `${EXTRACTION_PROMPT}\n\nRecipe text:\n${text}` }],
  });

  return parseModelResponse((message.content[0] as { text: string }).text);
}

export async function extractRecipeFromImage(
  base64Data: string,
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp"
): Promise<object> {
  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64Data } },
          { type: "text", text: EXTRACTION_PROMPT },
        ],
      },
    ],
  });

  return parseModelResponse((message.content[0] as { text: string }).text);
}
