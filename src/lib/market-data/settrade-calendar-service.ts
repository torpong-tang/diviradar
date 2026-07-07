export type SettradeCorporateAction = {
  symbol?: string;
  name?: string;
  caType?: string;
  type?: string;
  xdate?: string;
  paymentDate?: string | null;
  dividend?: number | null;
  dividendPayment?: string | null;
  dividendType?: string | null;
};

type SettradeCalendarDay = {
  date?: string;
  types?: {
    type?: string;
    corporateActions?: SettradeCorporateAction[];
  }[];
};

const SETTRADE_CALENDAR_URL = "https://www.settrade.com/th/equities/stock-calendar";

const headers = {
  accept: "application/json, text/plain, */*",
  "accept-language": "th-TH,th;q=0.9,en-US;q=0.8,en;q=0.7",
  referer: SETTRADE_CALENDAR_URL,
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"
};

function cookieHeader(response: Response) {
  const headersWithCookies = response.headers as Headers & { getSetCookie?: () => string[] };
  const cookies = headersWithCookies.getSetCookie?.() || response.headers.get("set-cookie")?.split(/,(?=\s*[^;=]+=[^;]+)/) || [];
  return cookies.map((cookie) => cookie.split(";")[0]).filter(Boolean).join("; ");
}

function numericDividend(action: SettradeCorporateAction) {
  const value = action.dividend ?? Number(String(action.dividendPayment || "").replace(/,/g, ""));
  return Number.isFinite(value) ? Number(value) : 0;
}

export type NormalizedSettradeDividend = {
  symbol: string;
  name: string;
  xdDate: string;
  paymentDate: string | null;
  dividendAmount: number;
  dividendType: string;
};

export async function fetchSettradeXdCalendar({
  year,
  month,
  symbols
}: {
  year: number;
  month: number;
  symbols: string[];
}): Promise<NormalizedSettradeDividend[]> {
  const pageResponse = await fetch(SETTRADE_CALENDAR_URL, {
    headers,
    cache: "no-store"
  });
  if (!pageResponse.ok) {
    throw new Error(`Settrade page unavailable (${pageResponse.status})`);
  }

  const cookies = cookieHeader(pageResponse);
  const params = new URLSearchParams({
    symbols: symbols.map((symbol) => symbol.toUpperCase()).join(","),
    caTypes: "XD"
  });
  const apiUrl = `https://www.settrade.com/api/set/stock-calendar/${year}/${month}/x-calendar?${params.toString()}`;
  const response = await fetch(apiUrl, {
    headers: {
      ...headers,
      ...(cookies ? { cookie: cookies } : {})
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Settrade calendar unavailable (${response.status})`);
  }

  const payload = (await response.json()) as SettradeCalendarDay[];
  const allowed = new Set(symbols.map((symbol) => symbol.toUpperCase()));
  return payload.flatMap((day) =>
    (day.types || []).flatMap((type) =>
      (type.corporateActions || [])
        .filter((action) => action.caType === "XD" || action.type === "XD")
        .filter((action) => Boolean(action.symbol && action.xdate))
        .filter((action) => allowed.size === 0 || allowed.has(String(action.symbol).toUpperCase()))
        .map((action) => ({
          symbol: String(action.symbol).toUpperCase(),
          name: action.name || "",
          xdDate: String(action.xdate),
          paymentDate: action.paymentDate || null,
          dividendAmount: numericDividend(action),
          dividendType: `Settrade • ${action.dividendType || "XD"}`
        }))
    )
  );
}
