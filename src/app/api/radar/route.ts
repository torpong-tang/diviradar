import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { withAuth } from "@/lib/api";
import { calculateRadarScore } from "@/lib/radar/calculate-score";

export async function GET() {
  return withAuth(async () => {
    await requireUser();
    const stocks = await prisma.stock.findMany({
      include: { prices: { orderBy: { priceDate: "desc" }, take: 1 }, dividends: true },
      orderBy: { symbol: "asc" }
    });
    return Response.json(stocks.map((stock) => ({ ...stock, radar: calculateRadarScore(stock) })));
  });
}
