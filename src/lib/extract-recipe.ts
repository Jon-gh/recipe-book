import Anthropic from "@anthropic-ai/sdk";

const EXTRACTION_PROMPT = `You are a recipe extraction assistant. Extract all recipe information from the provided input.

Return ONLY a valid JSON object with this exact structure — no markdown, no extra text:
{
  "name": "Recipe Name",
  "servings": 4,
  "ingredients": [
    {"name": "sirloin steak", "quantity": 250.0, "unit": "g", "preparation": "trimmed of visible fat and sliced into 1cm strips", "category": "meat & fish"},
    {"name": "bird's eye chilli", "quantity": 1.0, "unit": "", "preparation": "finely chopped", "category": "produce"},
    {"name": "fresh egg noodles", "quantity": 240.0, "unit": "g", "preparation": "", "category": "grains & pulses"},
    {"name": "soy sauce", "quantity": 2.0, "unit": "tbsp", "preparation": "", "category": "condiments & sauces"},
    {"name": "star anise", "quantity": 1.0, "unit": "", "preparation": "", "category": "spices & herbs"}
  ],
  "instructions": "Step 1: ...\\nStep 2: ...\\nStep 3: ...",
  "tags": ["asian", "noodles", "quick"]
}

Rules:
- servings must be a positive integer
- quantity must be a positive number
- unit must be a string; use "" when no unit applies (e.g. 2 eggs → unit "")
- name must be the pure ingredient only — no preparation details
- preparation describes how to prepare the ingredient; use "" if none
- instructions must be newline-separated steps
- tags must be a list of 1-5 lowercase category keywords
- category must be exactly one of: "produce", "meat & fish", "dairy & eggs", "bakery", "frozen", "drinks", "grains & pulses", "condiments & sauces", "spices & herbs", "other"
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
