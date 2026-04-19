-- Step 1: Create the Ingredient table
CREATE TABLE "Ingredient" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'other',

    CONSTRAINT "Ingredient_pkey" PRIMARY KEY ("id")
);

-- Unique constraint on name (one canonical record per ingredient)
CREATE UNIQUE INDEX "Ingredient_name_key" ON "Ingredient"("name");

-- Step 2: Backfill — for each distinct ingredient name, pick the most common category
-- (first-write-wins approach: if there is a tie, PostgreSQL will pick one deterministically)
INSERT INTO "Ingredient" ("name", "category")
SELECT DISTINCT ON (lower(name)) name, category
FROM "RecipeIngredient"
GROUP BY name, category
ORDER BY lower(name), count(*) DESC;

-- Step 3: Add ingredientId column as nullable so we can backfill
ALTER TABLE "RecipeIngredient" ADD COLUMN "ingredientId" INTEGER;

-- Step 4: Link each RecipeIngredient row to the matching Ingredient (case-insensitive)
UPDATE "RecipeIngredient" ri
SET "ingredientId" = i.id
FROM "Ingredient" i
WHERE lower(ri.name) = lower(i.name);

-- Step 5: Make ingredientId non-nullable now that every row is linked
ALTER TABLE "RecipeIngredient" ALTER COLUMN "ingredientId" SET NOT NULL;

-- Step 6: Add the foreign key constraint
ALTER TABLE "RecipeIngredient" ADD CONSTRAINT "RecipeIngredient_ingredientId_fkey"
    FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 7: Drop the now-redundant name and category columns from RecipeIngredient
ALTER TABLE "RecipeIngredient" DROP COLUMN "name";
ALTER TABLE "RecipeIngredient" DROP COLUMN "category";
