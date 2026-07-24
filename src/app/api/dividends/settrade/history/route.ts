import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { jsonError, withAuth } from "@/lib/api";
import { fetchSettradeXdCalendar } from "@/lib/market-data/settrade-calendar-service";
import { prismaSettradeXdRepository } from "@/lib/market-data/settrade-xd-repository";
import {
  bangkokYearMonth,
  syncSettradeXdCalendar
} from "@/lib/market-data/settrade-xd-sync-service";

async function latestSettradeRows(stockId: number) {
  return prisma.dividend.findMany({
    where: {
      stockId,
      dividendType: { startsWith: "Settrade" }
    },
    orderBy: { xdDate: "desc" },
    take: 4
  });
}

export async function POST(req: Request) {
  return withAuth(async () => {
    await requireUser();
    const body = await req.json().catch(() => ({}));
    const symbol = String(body.symbol || "").trim().toUpperCase();
    if (!symbol) return jsonError("Symbol is required", 400);

    const stock = await prisma.stock.findFirst({
      where: { symbol },
      select: { id: true, symbol: true, name: true }
    });
    if (!stock) return jsonError(`Stock not found: ${symbol}`, 404);

    const currentYear = Number(body.year || bangkokYearMonth().year);
    const yearsBack = Math.min(Math.max(Number(body.yearsBack || 6), 1), 10);
    const errors: string[] = [];
    const warnings: string[] = [];
    let fetched = 0;
    let upserted = 0;
    let created = 0;
    let updated = 0;
    let unchanged = 0;
    let duplicateRows = 0;
    let rejectedRows = 0;
    let conflictingRows = 0;
    let history = await latestSettradeRows(stock.id);

    for (let offset = 0; offset < yearsBack && history.length < 4; offset += 1) {
      const result = await syncSettradeXdCalendar(
        {
          fullYear: true,
          year: currentYear - offset,
          symbols: [symbol],
          successSettingKey: null,
          attemptSettingKey: null
        },
        {
          repository: prismaSettradeXdRepository,
          fetchCalendar: fetchSettradeXdCalendar
        }
      );
      fetched += result.fetched;
      upserted += result.upserted;
      created += result.created;
      updated += result.updated;
      unchanged += result.unchanged;
      duplicateRows += result.duplicateRows;
      rejectedRows += result.rejectedRows;
      conflictingRows += result.conflictingRows;
      errors.push(...result.errors);
      warnings.push(...result.warnings);
      history = await latestSettradeRows(stock.id);
    }

    const attemptedAt = new Date().toISOString();
    await prismaSettradeXdRepository.setSetting(
      `last_settrade_history_sync_attempt_${symbol}`,
      attemptedAt
    );
    if (errors.length === 0 && rejectedRows === 0 && conflictingRows === 0) {
      await prismaSettradeXdRepository.setSetting(
        `last_settrade_history_sync_${symbol}`,
        attemptedAt
      );
    }

    return Response.json(
      {
        ok: errors.length === 0 && rejectedRows === 0 && conflictingRows === 0,
        stock,
        fetched,
        upserted,
        created,
        updated,
        unchanged,
        duplicateRows,
        rejectedRows,
        conflictingRows,
        errors,
        warnings,
        dividends: history
      },
      { status: errors.length > 0 ? 207 : 200 }
    );
  });
}
