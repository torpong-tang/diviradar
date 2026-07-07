import { prisma } from "@/lib/prisma";
import { fetchYahooQuote } from "@/lib/market-data/yahoo-finance";

export async function updateStockPrice(symbol: string) {
  const stock = await prisma.stock.findFirst({
    where: { OR: [{ symbol }, { yahooSymbol: symbol }] }
  });
  if (!stock) throw new Error(`Stock not found: ${symbol}`);

  const quote = await fetchYahooQuote(stock.yahooSymbol);
  if (!quote) return null;

  return prisma.stockPrice.create({
    data: {
      stockId: stock.id,
      price: quote.price,
      change: quote.change,
      changePercent: quote.changePercent,
      volume: quote.volume,
      priceDate: quote.timestamp,
      source: "Yahoo Finance"
    }
  });
}

export async function updateAllStockPrices() {
  const stocks = await prisma.stock.findMany({ where: { isActive: true } });
  const results = [];
  for (const stock of stocks) {
    try {
      results.push(await updateStockPrice(stock.yahooSymbol));
    } catch (error) {
      console.warn(`Unable to update ${stock.yahooSymbol}`, error);
      results.push(null);
    }
  }
  return results.filter(Boolean);
}

export async function getLatestPrice(symbol: string) {
  const stock = await prisma.stock.findFirst({
    where: { OR: [{ symbol }, { yahooSymbol: symbol }] },
    include: { prices: { orderBy: { priceDate: "desc" }, take: 1 } }
  });
  return stock?.prices[0]?.price ?? null;
}
