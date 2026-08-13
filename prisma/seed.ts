import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in .env before seeding.",
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash,
      name: "Admin",
      role: "ADMIN_IT",
    },
  });

  console.log(`Seeded admin user: ${admin.email} (role: ${admin.role})`);

  // Additional users so the VRF invite→approve flow and RBAC can be exercised.
  // All share the same seed password for local dev convenience.
  const extraUsers = [
    { email: "finance@hoichoi.tv", name: "Finance Member", role: "FINANCE_TEAM" as const },
    { email: "cfo@hoichoi.tv", name: "Finance Head", role: "FINANCE_HEAD_CFO" as const },
    { email: "pm@hoichoi.tv", name: "Production Manager", role: "PRODUCTION_MANAGER" as const },
  ];

  for (const u of extraUsers) {
    const created = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { email: u.email, passwordHash, name: u.name, role: u.role },
    });
    console.log(`Seeded user: ${created.email} (role: ${created.role})`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
