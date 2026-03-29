const QTY_RE = /^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)\s*([a-zA-Z]{0,8})?\s+(.+)$/;

export function parseIngredientString(raw: string): object {
  const m = QTY_RE.exec(raw.trim());
  if (m) {
    const [, qtyStr, unit, rest] = m;
    let qty: number;
    if (qtyStr.includes(" ") && qtyStr.includes("/")) {
      const [whole, frac] = qtyStr.split(" ");
      const [num, den] = frac.split("/");
      qty = parseFloat(whole) + parseFloat(num) / parseFloat(den);
    } else if (qtyStr.includes("/")) {
      const [num, den] = qtyStr.split("/");
      qty = parseFloat(num) / parseFloat(den);
    } else {
      qty = parseFloat(qtyStr);
    }
    const commaIdx = rest.indexOf(",");
    const name = commaIdx >= 0 ? rest.slice(0, commaIdx) : rest;
    const prep = commaIdx >= 0 ? rest.slice(commaIdx + 1) : "";
    return { name: name.trim(), quantity: Math.round(qty * 1000) / 1000, unit: (unit ?? "").trim(), preparation: prep.trim() };
  }
  return { name: raw.trim(), quantity: 1, unit: "", preparation: "" };
}

export function parseJsonLdInstructions(raw: unknown): string {
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) {
    return raw
      .map((item) => (typeof item === "string" ? item : (item as Record<string, string>)?.text ?? ""))
      .filter(Boolean)
      .join("\n");
  }
  return "";
}

export function mapJsonLdRecipe(data: Record<string, unknown>): object {
  const name = (data.name as string) ?? "Unnamed Recipe";

  const yieldRaw = Array.isArray(data.recipeYield) ? data.recipeYield[0] : data.recipeYield ?? "4";
  const yieldMatch = String(yieldRaw).match(/\d+/);
  const servings = yieldMatch ? parseInt(yieldMatch[0]) : 4;

  const ingredients = ((data.recipeIngredient as string[]) ?? []).map(parseIngredientString);
  const instructions = parseJsonLdInstructions(data.recipeInstructions);

  const tags: string[] = [];
  const keywords = data.keywords ?? "";
  if (Array.isArray(keywords)) tags.push(...keywords.map((k) => String(k).trim().toLowerCase()));
  else if (keywords) tags.push(...String(keywords).split(",").map((k) => k.trim().toLowerCase()));

  for (const field of ["recipeCategory", "recipeCuisine"] as const) {
    const val = data[field];
    const vals = Array.isArray(val) ? val : val ? [val] : [];
    tags.push(...vals.map((v) => String(v).trim().toLowerCase()));
  }

  const seen = new Set<string>();
  const uniqueTags = tags.filter((t) => t && !seen.has(t) && seen.add(t)).slice(0, 5);

  return { name, servings, ingredients, instructions, tags: uniqueTags };
}

export function tryJsonLd(html: string): object | null {
  const scriptRe = /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = scriptRe.exec(html)) !== null) {
    try {
      const raw = JSON.parse(match[1]);
      const candidates = raw?.["@graph"] ?? (Array.isArray(raw) ? raw : [raw]);

      for (const item of candidates) {
        if (typeof item === "object" && String(item?.["@type"] ?? "").includes("Recipe")) {
          return mapJsonLdRecipe(item);
        }
      }
    } catch {
      continue;
    }
  }
  return null;
}

export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<(nav|footer|header|aside)[\s\S]*?<\/\1>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s{2,}/g, "\n")
    .trim();
}
