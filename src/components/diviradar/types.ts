export type RadarTone = "green" | "yellow" | "red";

export type Stock = {
  id: number;
  symbol: string;
  name: string;
  sector: string;
  yahooSymbol: string;
  dividendPerShare: number | null;
  targetBuyPrice: number | null;
  fairPriceLow: number | null;
  fairPriceHigh: number | null;
  stabilityScore: number;
  latestPrice: { price: number; change?: number; changePercent?: number; volume?: number; priceDate: string } | null;
  dividends: { id: number; xdDate: string | null; paymentDate: string | null; dividendAmount: number; dividendYear: number; dividendType?: string | null }[];
  radar: { score: number; status: string; tone: RadarTone; yieldPct: number; reasons: string[] };
};

export type PortfolioRow = {
  id: number;
  stockId: number;
  shares: number;
  avgCost: number;
  note?: string | null;
  stock: { symbol: string; name: string; dividendPerShare: number | null };
  currentPrice: number;
  currentValue: number;
  costValue: number;
  gainLoss: number;
  gainLossPct: number;
  estimatedDividend: number;
  monthlyDividend: number;
  yieldOnCost: number;
};

export type AlertRow = {
  id: number;
  stockId: number;
  alertType: string;
  targetValue?: number | null;
  isActive: boolean;
  stock: { symbol: string };
};

export type DividendHistoryRow = {
  id: number;
  xdDate: string | null;
  paymentDate: string | null;
  dividendAmount: number;
  dividendYear: number;
  dividendType?: string | null;
};

export type WatchlistSortKey = "symbol" | "price" | "yield" | "score" | "status";
export type SortDirection = "asc" | "desc";

export type SettingsForm = {
  monthly_dca_amount: string;
  auto_price_update_enabled: string;
  price_cron_days: string;
  price_cron_times: string;
  cron_time_tolerance_minutes: string;
  line_notify_enabled: string;
  line_channel_token: string;
  line_channel_token_configured: boolean;
  line_target_id: string;
  lineUserId: string;
};

export type Bootstrap = {
  user: { id: number; email: string; name?: string | null; lineUserId?: string | null };
  radar: Stock[];
  portfolioRows: PortfolioRow[];
  alerts: AlertRow[];
  settings: { key: string; value: string }[];
  notificationLogs: { id: number; title: string; message: string; channel: string; status: string; sentAt: string }[];
  summary: {
    watchlistCount: number;
    buyZoneCount: number;
    portfolioValue: number;
    annualDividend: number;
    monthlyDividend: number;
    dcaAmount: number;
    lastPriceUpdatedAt: string | null;
    lastSettradeXdSyncAt: string | null;
  };
  dcaPlan: { symbol: string; name: string; score: number; amount: number }[];
};
