/**
 * Run once after `prisma db push` to fix data that can't auto-migrate.
 * Usage: npx tsx prisma/migrate-to-better-auth.ts
 */
import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.update({
    where: { email: "jonathan.lerch@gmail.com" },
    data: { emailVerified: true },
  });
  console.log(`✓ emailVerified=true set for ${user.email} (id: ${user.id})`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
