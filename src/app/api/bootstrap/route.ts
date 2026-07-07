import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { withAuth } from "@/lib/api";
import { calculateRadarScore } from "@/lib/radar/calculate-score";
import { annualDividend } from "@/lib/dividend/dividend-yield";

export async function GET() {
  return withAuth(async () => {
    const user = await requireUser();
    const [stocks, portfolios, alerts, settings, notificationLogs] = await Promise.all([
      prisma.stock.findMany({
        where: { isActive: true },
        include: {
          prices: { orderBy: { priceDate: "desc" }, take: 1 },
          dividends: { orderBy: [{ xdDate: "desc" }], take: 12 }
        },
        orderBy: { symbol: "asc" }
      }),
      prisma.portfolio.findMany({
        where: { userId: user.id },
        include: { stock: { include: { prices: { orderBy: { priceDate: "desc" }, take: 1 } } } },
        orderBy: { updatedAt: "desc" }
      }),
      prisma.alert.findMany({ where: { userId: user.id }, include: { stock: true }, orderBy: { updatedAt: "desc" } }),
      prisma.setting.findMany(),
      prisma.notificationLog.findMany({ orderBy: { sentAt: "desc" }, take: 10 })
    ]);

    const radar = stocks.map((stock) => {
      const score = calculateRadarScore(stock);
      const latest = stock.prices[0] || null;
      return { ...stock, latestPrice: latest, radar: score };
    });

    const portfolioRows = portfolios.map((row) => {
      const price = row.stock.prices[0]?.price || 0;
      const currentValue = row.shares * price;
      const costValue = row.shares * row.avgCost;
      const estimatedDividend = annualDividend(row.shares, row.stock.dividendPerShare);
      return {
        ...row,
        currentPrice: price,
        currentValue,
        costValue,
        gainLoss: currentValue - costValue,
        gainLossPct: costValue > 0 ? ((currentValue - costValue) / costValue) * 100 : 0,
        estimatedDividend,
        monthlyDividend: estimatedDividend / 12,
        yieldOnCost: costValue > 0 ? (estimatedDividend / costValue) * 100 : 0
      };
    });

    const summary = {
      watchlistCount: stocks.length,
      buyZoneCount: radar.filter((x) => x.radar.score >= 80).length,
      portfolioValue: portfolioRows.reduce((sum, x) => sum + x.currentValue, 0),
      annualDividend: portfolioRows.reduce((sum, x) => sum + x.estimatedDividend, 0),
      monthlyDividend: portfolioRows.reduce((sum, x) => sum + x.monthlyDividend, 0),
      dcaAmount: Number(settings.find((x) => x.key === "monthly_dca_amount")?.value || 20000),
      lastSettradeXdSyncAt: settings.find((x) => x.key === "last_settrade_xd_sync_at")?.value || null,
      lastPriceUpdatedAt:
        radar
          .map((stock) => stock.latestPrice?.priceDate?.toISOString())
          .filter((value): value is string => Boolean(value))
          .sort()
          .at(-1) ?? null
    };

    const dcaCandidates = radar
      .filter((x) => x.radar.score >= 80)
      .sort((a, b) => b.radar.score - a.radar.score)
      .slice(0, 3);
    const dcaPlan = dcaCandidates.map((stock, index) => ({
      symbol: stock.symbol,
      name: stock.name,
      score: stock.radar.score,
      amount: Math.round((summary.dcaAmount * (index === 0 ? 0.4 : index === 1 ? 0.35 : 0.25)) / 100) * 100
    }));

    return Response.json({ user, radar, portfolioRows, alerts, settings, notificationLogs, summary, dcaPlan });
  });
}
