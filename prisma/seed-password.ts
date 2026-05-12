/**
 * Sets the initial email+password credential for jonathan.lerch@gmail.com.
 * Run once after migrating to Better Auth:
 *   INITIAL_PASSWORD=yourpassword npx tsx prisma/seed-password.ts
 */
import { PrismaClient } from "../src/generated/prisma";
import { hashPassword } from "@better-auth/utils/password";

const prisma = new PrismaClient();
const EMAIL = "jonathan.lerch@gmail.com";

async function main() {
  const password = process.env.INITIAL_PASSWORD;
  if (!password) {
    console.error("Set INITIAL_PASSWORD env var before running this script.");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email: EMAIL } });
  if (!user) {
    console.error(`User ${EMAIL} not found — run prisma/migrate-to-better-auth.ts first.`);
    process.exit(1);
  }

  const existing = await prisma.account.findFirst({
    where: { userId: user.id, providerId: "credential" },
  });
  if (existing) {
    console.log(`Credential account already exists for ${EMAIL} — updating password.`);
    await prisma.account.update({
      where: { id: existing.id },
      data: { password: await hashPassword(password) },
    });
  } else {
    await prisma.account.create({
      data: {
        accountId: user.id,
        providerId: "credential",
        userId: user.id,
        password: await hashPassword(password),
      },
    });
  }

  console.log(`✓ Password set for ${EMAIL}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
