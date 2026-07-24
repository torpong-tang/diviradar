import { prisma } from "@/lib/prisma";
import type {
  XdPersistResult,
  XdSyncRepository,
  XdSyncRow
} from "@/lib/market-data/settrade-xd-sync-service";

function sameDate(left: Date | null, right: Date | null) {
  return left?.getTime() === right?.getTime();
}

function sameStoredDividend(
  existing: {
    paymentDate: Date | null;
    dividendAmount: number;
    dividendYear: number;
    dividendType: string | null;
  },
  row: XdSyncRow
) {
  return (
    sameDate(existing.paymentDate, row.paymentDate) &&
    existing.dividendAmount === row.dividendAmount &&
    existing.dividendYear === row.dividendYear &&
    existing.dividendType === row.dividendType
  );
}

export const prismaSettradeXdRepository: XdSyncRepository = {
  async listActiveStocks() {
    return prisma.stock.findMany({
      where: { isActive: true },
      select: { id: true, symbol: true },
      orderBy: { symbol: "asc" }
    });
  },

  async upsertDividends(rows): Promise<XdPersistResult> {
    return prisma.$transaction(async (transaction) => {
      let created = 0;
      let updated = 0;
      let unchanged = 0;

      for (const row of rows) {
        const existing = await transaction.dividend.findUnique({
          where: {
            stockId_xdDate: {
              stockId: row.stockId,
              xdDate: row.xdDate
            }
          }
        });
        const data = {
          stockId: row.stockId,
          xdDate: row.xdDate,
          paymentDate: row.paymentDate,
          dividendAmount: row.dividendAmount,
          dividendYear: row.dividendYear,
          dividendType: row.dividendType
        };

        if (!existing) {
          await transaction.dividend.create({ data });
          created += 1;
        } else if (sameStoredDividend(existing, row)) {
          unchanged += 1;
        } else {
          await transaction.dividend.update({
            where: { id: existing.id },
            data
          });
          updated += 1;
        }
      }

      return { created, updated, unchanged };
    });
  },

  async setSetting(key, value) {
    await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value }
    });
  }
};
