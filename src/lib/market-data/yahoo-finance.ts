export type YahooQuote = {
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: Date;
};

export async function fetchYahooQuote(symbol: string): Promise<YahooQuote | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1m`;
  const response = await fetch(url, {
    headers: { "User-Agent": "DiviRadar/1.0" },
    next: { revalidate: 60 }
  });
  if (!response.ok) return null;

  const payload = await response.json();
  const result = payload?.chart?.result?.[0];
  const meta = result?.meta;
  if (!meta?.regularMarketPrice) return null;

  const previous = Number(meta.previousClose || meta.chartPreviousClose || meta.regularMarketPrice);
  const price = Number(meta.regularMarketPrice);
  const change = price - previous;
  const changePercent = previous > 0 ? (change / previous) * 100 : 0;

  return {
    price,
    change,
    changePercent,
    volume: Number(meta.regularMarketVolume || 0),
    timestamp: new Date((Number(meta.regularMarketTime) || Math.floor(Date.now() / 1000)) * 1000)
  };
}
