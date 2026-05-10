/**
 * One-time seed: creates the primary user and assigns all existing data to them.
 * Run with: npx tsx prisma/seed-main-user.ts
 */
import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

async function main() {
  const email = "jonathan.lerch@gmail.com";

  // Create (or find) the primary user
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: "Jon" },
  });

  console.log(`Primary user: ${user.id} (${user.email})`);

  // Assign all existing recipes to this user
  const recipeCount = await prisma.recipe.updateMany({
    where: { userId: null },
    data: { userId: user.id },
  });
  console.log(`Updated ${recipeCount.count} recipes`);

  // Assign all meal plan entries to this user
  const mealPlanCount = await prisma.mealPlanEntry.updateMany({
    where: { userId: null },
    data: { userId: user.id },
  });
  console.log(`Updated ${mealPlanCount.count} meal plan entries`);

  // Assign all scheduled meals to this user
  const scheduledCount = await prisma.scheduledMeal.updateMany({
    where: { userId: null },
    data: { userId: user.id },
  });
  console.log(`Updated ${scheduledCount.count} scheduled meals`);

  // Assign all shopping list items to this user
  const shoppingCount = await prisma.shoppingListItem.updateMany({
    where: { userId: null },
    data: { userId: user.id },
  });
  console.log(`Updated ${shoppingCount.count} shopping list items`);

  // Migrate shopping session: delete the old singleton, create a new per-user one
  const oldSession = await prisma.shoppingSession.findFirst({
    where: { userId: null },
  });
  if (oldSession) {
    // Transfer state to the new per-user session
    await prisma.shoppingSession.delete({ where: { id: oldSession.id } });
    await prisma.shoppingSession.create({
      data: {
        userId: user.id,
        checkedKeys: oldSession.checkedKeys,
        showStaples: oldSession.showStaples,
        weekStart: oldSession.weekStart,
        weekEnd: oldSession.weekEnd,
      },
    });
    console.log("Migrated shopping session to primary user");
  }

  console.log("Seed complete.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
