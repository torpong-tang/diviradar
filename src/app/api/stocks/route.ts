import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { withAuth, jsonError } from "@/lib/api";

export async function GET() {
  return withAuth(async () => {
    await requireUser();
    const stocks = await prisma.stock.findMany({
      include: { prices: { orderBy: { priceDate: "desc" }, take: 1 }, dividends: true },
      orderBy: { symbol: "asc" }
    });
    return Response.json(stocks);
  });
}

export async function POST(req: Request) {
  return withAuth(async () => {
    await requireUser();
    const body = await req.json();
    if (!body.symbol || !body.name || !body.yahooSymbol) return jsonError("Symbol, name, and Yahoo symbol are required");
    const stock = await prisma.stock.create({
      data: {
        symbol: String(body.symbol).toUpperCase(),
        name: body.name,
        sector: body.sector || "Other",
        yahooSymbol: String(body.yahooSymbol).toUpperCase(),
        dividendPerShare: Number(body.dividendPerShare || 0),
        targetBuyPrice: Number(body.targetBuyPrice || 0),
        fairPriceLow: Number(body.fairPriceLow || 0),
        fairPriceHigh: Number(body.fairPriceHigh || 0),
        stabilityScore: Number(body.stabilityScore || 80)
      }
    });
    return Response.json(stock, { status: 201 });
  });
}
