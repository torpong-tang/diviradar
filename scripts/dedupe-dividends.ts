import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");

async function main() {
  const rows = await prisma.dividend.findMany({
    where: { xdDate: { not: null } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      stockId: true,
      xdDate: true,
      createdAt: true
    }
  });
  const keepByKey = new Map<string, number>();
  const duplicateIds: number[] = [];

  for (const row of rows) {
    if (!row.xdDate) continue;
    const key = `${row.stockId}:${row.xdDate.toISOString()}`;
    if (keepByKey.has(key)) {
      duplicateIds.push(row.id);
    } else {
      keepByKey.set(key, row.id);
    }
  }

  console.log(`Duplicate dividend rows found: ${duplicateIds.length}`);
  if (duplicateIds.length === 0) return;
  if (!apply) {
    console.log("Dry run only. Re-run with --apply after backing up the database.");
    return;
  }

  const result = await prisma.dividend.deleteMany({
    where: { id: { in: duplicateIds } }
  });
  console.log(`Duplicate dividend rows deleted: ${result.count}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
