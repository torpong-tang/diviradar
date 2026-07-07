import type { Dividend, Stock, StockPrice } from "@prisma/client";
import { dividendYield } from "@/lib/dividend/dividend-yield";

export type RadarStock = Stock & { prices: StockPrice[]; dividends?: Dividend[] };

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function zoneScore(stock: Stock, price: number) {
  if (!stock.fairPriceLow || !stock.fairPriceHigh) return 12;
  if (price <= stock.fairPriceLow) return 25;
  if (price <= stock.fairPriceHigh) return 24;
  if (price <= stock.fairPriceHigh * 1.08) return 12;
  return 5;
}

function highLowScore(stock: Stock, price: number) {
  if (!stock.weekLow52 || !stock.weekHigh52 || stock.weekHigh52 <= stock.weekLow52) return 8;
  const position = (price - stock.weekLow52) / (stock.weekHigh52 - stock.weekLow52);
  return clamp(15 - position * 15, 2, 15);
}

function yieldScore(yieldPct: number) {
  if (yieldPct >= 7) return 25;
  if (yieldPct >= 6) return 21;
  if (yieldPct >= 5) return 16;
  if (yieldPct >= 4) return 10;
  return 4;
}

export function calculateRadarScore(stock: RadarStock, nextXdDays?: number | null) {
  const latest = stock.prices[0];
  const price = latest?.price || 0;
  const y = dividendYield(stock.dividendPerShare, price);
  const inferredXdDays =
    nextXdDays ??
    stock.dividends
      ?.map((dividend) => (dividend.xdDate ? Math.ceil((dividend.xdDate.getTime() - Date.now()) / 86400000) : null))
      .filter((days): days is number => days !== null && days >= 0)
      .sort((a, b) => a - b)[0] ??
    null;
  const score =
    yieldScore(y) +
    zoneScore(stock, price) +
    highLowScore(stock, price) +
    clamp(stock.stabilityScore, 0, 100) * 0.15 +
    (inferredXdDays != null && inferredXdDays <= 45 ? 10 : 7) +
    clamp(stock.dividendGrowth || 0, 0, 10);

  const rounded = Math.round(clamp(score));
  const status = rounded >= 80 ? "น่าสะสม" : rounded >= 60 ? "รอดู" : "แพง / ยังไม่เหมาะ";
  const tone = rounded >= 80 ? "green" : rounded >= 60 ? "yellow" : "red";
  const reasons = [
    `Yield ประมาณ ${y.toFixed(1)}%`,
    price <= (stock.fairPriceHigh || 0) ? "ราคาอยู่ในโซนสะสม/โซนยุติธรรม" : "ราคาสูงกว่า Fair Zone",
    `ความมั่นคง ${stock.stabilityScore}/100`,
    (stock.dividendGrowth || 0) > 0 ? `Dividend Growth ${stock.dividendGrowth}%` : "Dividend Growth ยังไม่เด่น"
  ];

  return { score: rounded, status, tone, yieldPct: y, reasons };
}
