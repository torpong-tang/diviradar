import type { NormalizedSettradeDividend } from "@/lib/market-data/settrade-calendar-service";

export type XdSyncTarget = {
  year: number;
  month: number;
};

export type XdSyncRequest = {
  symbols?: unknown;
  months?: unknown;
  fullYear?: unknown;
  year?: unknown;
  month?: unknown;
  monthCount?: unknown;
  successSettingKey?: string | null;
  attemptSettingKey?: string | null;
};

export type ActiveStock = {
  id: number;
  symbol: string;
};

export type XdSyncRow = {
  stockId: number;
  symbol: string;
  xdDate: Date;
  paymentDate: Date | null;
  dividendAmount: number;
  dividendYear: number;
  dividendType: string | null;
};

export type XdPersistResult = {
  created: number;
  updated: number;
  unchanged: number;
};

export interface XdSyncRepository {
  listActiveStocks(): Promise<ActiveStock[]>;
  upsertDividends(rows: XdSyncRow[]): Promise<XdPersistResult>;
  setSetting(key: string, value: string): Promise<void>;
}

type SyncDependencies = {
  repository: XdSyncRepository;
  fetchCalendar: (input: {
    year: number;
    month: number;
    symbols: string[];
  }) => Promise<NormalizedSettradeDividend[]>;
  now?: () => Date;
};

type PreparedRows = {
  rows: XdSyncRow[];
  duplicateRows: number;
  rejectedRows: number;
  conflictingRows: number;
  warnings: string[];
};

export type XdSyncResult = XdPersistResult & {
  ok: boolean;
  source: "Settrade Stock Calendar";
  months: XdSyncTarget[];
  symbols: string[];
  fetched: number;
  accepted: number;
  upserted: number;
  duplicateRows: number;
  rejectedRows: number;
  conflictingRows: number;
  successfulTargets: number;
  errors: string[];
  warnings: string[];
};

const MIN_YEAR = 2000;
const MAX_YEAR = 2200;
const MAX_MONTH_COUNT = 24;

function integer(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : fallback;
}

function validateTarget(target: XdSyncTarget) {
  if (target.year < MIN_YEAR || target.year > MAX_YEAR) {
    throw new Error(`Invalid XD calendar year: ${target.year}`);
  }
  if (target.month < 1 || target.month > 12) {
    throw new Error(`Invalid XD calendar month: ${target.month}`);
  }
  return target;
}

export function bangkokYearMonth(now = new Date()): XdSyncTarget {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "numeric"
  }).formatToParts(now);
  return {
    year: Number(parts.find((part) => part.type === "year")?.value || now.getUTCFullYear()),
    month: Number(parts.find((part) => part.type === "month")?.value || now.getUTCMonth() + 1)
  };
}

function nextMonths(year: number, month: number, count: number) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1 + index, 1));
    return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
  });
}

export function resolveXdSyncTargets(request: XdSyncRequest, now = new Date()) {
  const current = bangkokYearMonth(now);
  let targets: XdSyncTarget[];

  if (Array.isArray(request.months) && request.months.length > 0) {
    targets = request.months.map((item) => {
      const value = item as { year?: unknown; month?: unknown };
      return validateTarget({
        year: integer(value?.year, Number.NaN),
        month: integer(value?.month, Number.NaN)
      });
    });
  } else if (request.fullYear === true) {
    const year = integer(request.year, current.year);
    targets = Array.from({ length: 12 }, (_, index) => validateTarget({ year, month: index + 1 }));
  } else {
    const year = integer(request.year, current.year);
    const month = integer(request.month, current.month);
    const count = Math.min(Math.max(integer(request.monthCount, 12), 1), MAX_MONTH_COUNT);
    validateTarget({ year, month });
    targets = nextMonths(year, month, count).map(validateTarget);
  }

  const unique = new Map(targets.map((target) => [`${target.year}-${target.month}`, target]));
  return Array.from(unique.values());
}

function parseDate(value: string | null | undefined) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

function sameRow(left: XdSyncRow, right: XdSyncRow) {
  return (
    left.stockId === right.stockId &&
    left.xdDate.getTime() === right.xdDate.getTime() &&
    left.paymentDate?.getTime() === right.paymentDate?.getTime() &&
    left.dividendAmount === right.dividendAmount &&
    left.dividendType === right.dividendType
  );
}

export function prepareXdSyncRows(
  rows: NormalizedSettradeDividend[],
  stocks: ActiveStock[]
): PreparedRows {
  const stockBySymbol = new Map(
    stocks.map((stock) => [stock.symbol.trim().toUpperCase(), stock])
  );
  const prepared = new Map<string, XdSyncRow>();
  const blockedKeys = new Set<string>();
  const warnings: string[] = [];
  let duplicateRows = 0;
  let rejectedRows = 0;
  let conflictingRows = 0;

  for (const row of rows) {
    const symbol = row.symbol.trim().toUpperCase();
    const stock = stockBySymbol.get(symbol);
    const xdDate = parseDate(row.xdDate);
    const paymentDate = row.paymentDate ? parseDate(row.paymentDate) : null;
    const dividendAmount = Number(row.dividendAmount);

    if (!stock) {
      rejectedRows += 1;
      warnings.push(`Ignored XD row for inactive or unknown symbol: ${symbol || "(empty)"}`);
      continue;
    }
    if (!xdDate) {
      rejectedRows += 1;
      warnings.push(`Ignored ${symbol} XD row with invalid date: ${row.xdDate || "(empty)"}`);
      continue;
    }
    if (row.paymentDate && !paymentDate) {
      rejectedRows += 1;
      warnings.push(`Ignored ${symbol} XD row with invalid payment date: ${row.paymentDate}`);
      continue;
    }
    if (!Number.isFinite(dividendAmount) || dividendAmount < 0) {
      rejectedRows += 1;
      warnings.push(`Ignored ${symbol} XD row with invalid dividend amount`);
      continue;
    }

    const key = `${stock.id}:${xdDate.toISOString()}`;
    if (blockedKeys.has(key)) {
      duplicateRows += 1;
      continue;
    }

    const candidate: XdSyncRow = {
      stockId: stock.id,
      symbol,
      xdDate,
      paymentDate,
      dividendAmount,
      dividendYear: xdDate.getUTCFullYear(),
      dividendType: row.dividendType || null
    };
    const existing = prepared.get(key);
    if (!existing) {
      prepared.set(key, candidate);
      continue;
    }

    duplicateRows += 1;
    if (!sameRow(existing, candidate)) {
      conflictingRows += 1;
      prepared.delete(key);
      blockedKeys.add(key);
      warnings.push(`Ignored conflicting duplicate XD rows for ${symbol} on ${row.xdDate}`);
    }
  }

  return {
    rows: Array.from(prepared.values()),
    duplicateRows,
    rejectedRows,
    conflictingRows,
    warnings
  };
}

function rowBelongsToTarget(row: NormalizedSettradeDividend, target: XdSyncTarget) {
  const date = parseDate(row.xdDate);
  return Boolean(
    date &&
      date.getUTCFullYear() === target.year &&
      date.getUTCMonth() + 1 === target.month
  );
}

function requestedSymbols(value: unknown, activeStocks: ActiveStock[]) {
  const active = new Set(activeStocks.map((stock) => stock.symbol.trim().toUpperCase()));
  if (!Array.isArray(value) || value.length === 0) return Array.from(active);
  return Array.from(
    new Set(
      value
        .map((symbol) => String(symbol).trim().toUpperCase())
        .filter((symbol) => active.has(symbol))
    )
  );
}

export async function syncSettradeXdCalendar(
  request: XdSyncRequest,
  dependencies: SyncDependencies
): Promise<XdSyncResult> {
  const now = dependencies.now?.() || new Date();
  const months = resolveXdSyncTargets(request, now);
  const activeStocks = await dependencies.repository.listActiveStocks();
  const symbols = requestedSymbols(request.symbols, activeStocks);
  if (symbols.length === 0) {
    throw new Error("No active stock symbols selected for XD sync");
  }

  const fetchedRows: NormalizedSettradeDividend[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  let fetched = 0;
  let successfulTargets = 0;
  let rejectedRowsOutsideTarget = 0;

  for (const target of months) {
    try {
      const rows = await dependencies.fetchCalendar({ ...target, symbols });
      fetched += rows.length;
      successfulTargets += 1;
      for (const row of rows) {
        if (rowBelongsToTarget(row, target)) {
          fetchedRows.push(row);
        } else {
          rejectedRowsOutsideTarget += 1;
          warnings.push(
            `Ignored ${row.symbol || "(unknown)"} XD row outside requested month ${target.year}-${String(target.month).padStart(2, "0")}`
          );
        }
      }
    } catch (error) {
      errors.push(
        `${target.year}-${String(target.month).padStart(2, "0")}: ${
          error instanceof Error ? error.message : "unknown error"
        }`
      );
    }
  }

  const selectedStocks = activeStocks.filter((stock) =>
    symbols.includes(stock.symbol.trim().toUpperCase())
  );
  const prepared = prepareXdSyncRows(fetchedRows, selectedStocks);
  const persisted =
    prepared.rows.length > 0
      ? await dependencies.repository.upsertDividends(prepared.rows)
      : { created: 0, updated: 0, unchanged: 0 };

  const attemptedAt = now.toISOString();
  const attemptSettingKey =
    request.attemptSettingKey === undefined
      ? "last_settrade_xd_sync_attempt_at"
      : request.attemptSettingKey;
  const successSettingKey =
    request.successSettingKey === undefined
      ? "last_settrade_xd_sync_at"
      : request.successSettingKey;
  if (attemptSettingKey) {
    await dependencies.repository.setSetting(attemptSettingKey, attemptedAt);
  }

  const rejectedRows = prepared.rejectedRows + rejectedRowsOutsideTarget;
  const ok =
    errors.length === 0 &&
    rejectedRows === 0 &&
    prepared.conflictingRows === 0;
  if (ok && successSettingKey) {
    await dependencies.repository.setSetting(successSettingKey, attemptedAt);
  }

  return {
    ok,
    source: "Settrade Stock Calendar",
    months,
    symbols,
    fetched,
    accepted: prepared.rows.length,
    upserted: persisted.created + persisted.updated,
    duplicateRows: prepared.duplicateRows,
    rejectedRows,
    conflictingRows: prepared.conflictingRows,
    successfulTargets,
    errors,
    warnings: [...warnings, ...prepared.warnings],
    ...persisted
  };
}
