import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { withAuth } from "@/lib/api";
import { fetchSettradeXdCalendar } from "@/lib/market-data/settrade-calendar-service";

function bangkokYearMonth() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "numeric"
  }).formatToParts(new Date());
  return {
    year: Number(parts.find((part) => part.type === "year")?.value || new Date().getFullYear()),
    month: Number(parts.find((part) => part.type === "month")?.value || new Date().getMonth() + 1)
  };
}

function nextMonths(year: number, month: number, count: number) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1 + index, 1));
    return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
  });
}

export async function POST(req: Request) {
  return withAuth(async () => {
    await requireUser();
    const body = await req.json().catch(() => ({}));
    const stocks = await prisma.stock.findMany({
      where: { isActive: true },
      select: { id: true, symbol: true }
    });
    const requestedSymbols = Array.isArray(body.symbols) && body.symbols.length
      ? body.symbols.map((symbol: unknown) => String(symbol).toUpperCase())
      : stocks.map((stock) => stock.symbol.toUpperCase());
    const stockBySymbol = new Map(stocks.map((stock) => [stock.symbol.toUpperCase(), stock]));
    const current = bangkokYearMonth();
    const months = Array.isArray(body.months) && body.months.length
      ? body.months.map((item: { year: number; month: number }) => ({ year: Number(item.year), month: Number(item.month) }))
      : body.fullYear
        ? Array.from({ length: 12 }, (_, index) => ({ year: Number(body.year || current.year), month: index + 1 }))
        : nextMonths(Number(body.year || current.year), Number(body.month || current.month), Number(body.monthCount || 12));

    let fetched = 0;
    let upserted = 0;
    const errors: string[] = [];

    for (const target of months) {
      try {
        const rows = await fetchSettradeXdCalendar({
          year: target.year,
          month: target.month,
          symbols: requestedSymbols
        });
        fetched += rows.length;

        for (const row of rows) {
          const stock = stockBySymbol.get(row.symbol);
          if (!stock) continue;
          const xdDate = new Date(row.xdDate);
          const paymentDate = row.paymentDate ? new Date(row.paymentDate) : null;
          const existing = await prisma.dividend.findFirst({
            where: {
              stockId: stock.id,
              xdDate
            }
          });
          const data = {
            stockId: stock.id,
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
          upserted += 1;
        }
      } catch (error) {
        errors.push(`${target.year}-${String(target.month).padStart(2, "0")}: ${error instanceof Error ? error.message : "unknown error"}`);
      }
    }

    await prisma.setting.upsert({
      where: { key: "last_settrade_xd_sync_at" },
      update: { value: new Date().toISOString() },
      create: { key: "last_settrade_xd_sync_at", value: new Date().toISOString() }
    });

    return Response.json({
      ok: errors.length === 0,
      source: "Settrade Stock Calendar",
      months,
      symbols: requestedSymbols,
      fetched,
      upserted,
      errors
    });
  });
}
