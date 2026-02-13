import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.dashboard.findFirst({ where: { isDefault: true } });
  if (existing) {
    console.log("Default dashboard already exists.");
    return;
  }

  const dashboard = await prisma.dashboard.create({
    data: {
      name: "My Home",
      description: "A calm place for your daily updates.",
      isDefault: true,
    },
  });

  console.log(`Created default dashboard ${dashboard.name}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
