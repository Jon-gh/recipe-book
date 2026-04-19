/**
 * One-off migration: normalise ingredient units and remove trivial ingredients
 * from all existing recipes in the database.
 *
 * Usage:
 *   npx tsx scripts/normalize-ingredients.ts          # dry run — shows changes, writes nothing
 *   npx tsx scripts/normalize-ingredients.ts --apply  # apply changes to the DB
 */
import { PrismaClient } from "../src/generated/prisma";

const APPLY = process.argv.includes("--apply");

const prisma = new PrismaClient();

// ── normalization logic (mirrors src/lib/grocery-list.ts) ──────────────────

const TRIVIAL_INGREDIENTS = new Set(["water"]);

const METRIC_CONVERSIONS: Record<string, { canonical: string; factor: number }> = {
  kg: { canonical: "g", factor: 1000 },
  l: { canonical: "ml", factor: 1000 },
  litre: { canonical: "ml", factor: 1000 },
  litres: { canonical: "ml", factor: 1000 },
  liter: { canonical: "ml", factor: 1000 },
  liters: { canonical: "ml", factor: 1000 },
};

const SIZE_QUALIFIERS = new Set([
  "fat", "small", "large", "big", "heaped", "rounded",
  "level", "generous", "thick", "thin", "whole",
]);

const UNIT_ALIASES: Record<string, string> = {
  handful: "bunch",
  handfuls: "bunch",
  bunches: "bunch",
  cloves: "clove",
  sprigs: "sprig",
  slices: "slice",
  pieces: "piece",
  grams: "g",
  kilograms: "kg",
  milliliters: "ml",
  millilitres: "ml",
  tablespoons: "tbsp",
  teaspoons: "tsp",
  cups: "cup",
};

function normalizeUnit(unit: string): { canonical: string; factor: number } {
  const u = unit.trim().toLowerCase();
  if (METRIC_CONVERSIONS[u]) return METRIC_CONVERSIONS[u];
  const words = u.split(/\s+/);
  const base =
    words.length > 1 && SIZE_QUALIFIERS.has(words[0]) ? words.slice(1).join(" ") : u;
  return { canonical: UNIT_ALIASES[base] ?? base, factor: 1 };
}

// ── main ───────────────────────────────────────────────────────────────────

async function main() {
  const ingredients = await prisma.recipeIngredient.findMany({
    include: { recipe: { select: { name: true } }, product: true },
    orderBy: [{ recipeId: "asc" }, { id: "asc" }],
  });

  type Change =
    | { type: "delete"; id: number; recipeName: string; name: string; reason: string }
    | { type: "update"; id: number; recipeName: string; name: string; oldUnit: string; newUnit: string; oldQty: number; newQty: number };

  const changes: Change[] = [];

  for (const ing of ingredients) {
    const ingName = ing.product.name;
    if (TRIVIAL_INGREDIENTS.has(ingName.trim().toLowerCase())) {
      changes.push({ type: "delete", id: ing.id, recipeName: ing.recipe.name, name: ingName, reason: "trivial ingredient" });
      continue;
    }

    const { canonical, factor } = normalizeUnit(ing.unit);
    const newQty = factor !== 1 ? Math.round(ing.quantity * factor * 1000) / 1000 : ing.quantity;

    if (canonical !== ing.unit || newQty !== ing.quantity) {
      changes.push({
        type: "update",
        id: ing.id,
        recipeName: ing.recipe.name,
        name: ingName,
        oldUnit: ing.unit,
        newUnit: canonical,
        oldQty: ing.quantity,
        newQty,
      });
    }
  }

  if (changes.length === 0) {
    console.log("No changes needed — all ingredients are already normalised.");
    return;
  }

  // Group by recipe for readability
  const byRecipe = new Map<string, Change[]>();
  for (const c of changes) {
    if (!byRecipe.has(c.recipeName)) byRecipe.set(c.recipeName, []);
    byRecipe.get(c.recipeName)!.push(c);
  }

  console.log(`\n${APPLY ? "Applying" : "Dry run —"} ${changes.length} change(s) across ${byRecipe.size} recipe(s):\n`);

  for (const [recipe, recipeChanges] of Array.from(byRecipe.entries())) {
    console.log(`  ${recipe}`);
    for (const c of recipeChanges) {
      if (c.type === "delete") {
        console.log(`    DELETE  "${c.name}"  (${c.reason})`);
      } else {
        const qtyPart = c.oldQty !== c.newQty ? `${c.oldQty} → ${c.newQty}` : `${c.oldQty}`;
        console.log(`    UPDATE  "${c.name}"  unit: "${c.oldUnit}" → "${c.newUnit}"  qty: ${qtyPart}`);
      }
    }
  }

  if (!APPLY) {
    console.log("\nRun with --apply to write these changes to the database.");
    return;
  }

  // Apply changes
  let updated = 0;
  let deleted = 0;

  await prisma.$transaction(async (tx) => {
    for (const c of changes) {
      if (c.type === "delete") {
        await tx.recipeIngredient.delete({ where: { id: c.id } });
        deleted++;
      } else {
        await tx.recipeIngredient.update({
          where: { id: c.id },
          data: { unit: c.newUnit, quantity: c.newQty },
        });
        updated++;
      }
    }
  });

  console.log(`\nDone. Updated ${updated} ingredient(s), deleted ${deleted} ingredient(s).`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
