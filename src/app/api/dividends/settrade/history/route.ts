import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { jsonError, withAuth } from "@/lib/api";
import { fetchSettradeXdCalendar } from "@/lib/market-data/settrade-calendar-service";

function bangkokYear() {
  const year = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric"
  }).format(new Date());
  return Number(year || new Date().getFullYear());
}

async function upsertSettradeDividend(stockId: number, row: Awaited<ReturnType<typeof fetchSettradeXdCalendar>>[number]) {
  const xdDate = new Date(row.xdDate);
  const paymentDate = row.paymentDate ? new Date(row.paymentDate) : null;
  const existing = await prisma.dividend.findFirst({
    where: {
      stockId,
      xdDate
    }
  });
  const data = {
    stockId,
    xdDate,
    paymentDate,
    dividendAmount: row.dividendAmount,
    dividendYear: xdDate.getFullYear(),
    dividendType: row.dividendType
  };
  if (existing) {
    await prisma.dividend.update({ where: { id: existing.id }, data });
  } else {
    await prisma.dividend.create({ data });
  }
}

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

    const currentYear = Number(body.year || bangkokYear());
    const yearsBack = Math.min(Math.max(Number(body.yearsBack || 6), 1), 10);
    const errors: string[] = [];
    let fetched = 0;
    let upserted = 0;
    let history = await latestSettradeRows(stock.id);

    for (let offset = 0; offset < yearsBack && history.length < 4; offset += 1) {
      const year = currentYear - offset;
      for (let month = 1; month <= 12; month += 1) {
        try {
          const rows = await fetchSettradeXdCalendar({ year, month, symbols: [symbol] });
          fetched += rows.length;
          for (const row of rows) {
            await upsertSettradeDividend(stock.id, row);
            upserted += 1;
          }
        } catch (error) {
          errors.push(`${year}-${String(month).padStart(2, "0")}: ${error instanceof Error ? error.message : "unknown error"}`);
        }
      }
      history = await latestSettradeRows(stock.id);
    }

    await prisma.setting.upsert({
      where: { key: `last_settrade_history_sync_${symbol}` },
      update: { value: new Date().toISOString() },
      create: { key: `last_settrade_history_sync_${symbol}`, value: new Date().toISOString() }
    });

    return Response.json({
      ok: errors.length === 0,
      stock,
      fetched,
      upserted,
      errors,
      dividends: history
    });
  });
}
