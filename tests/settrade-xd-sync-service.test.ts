import assert from "node:assert/strict";
import test from "node:test";
import type { NormalizedSettradeDividend } from "../src/lib/market-data/settrade-calendar-service";
import {
  prepareXdSyncRows,
  resolveXdSyncTargets,
  syncSettradeXdCalendar,
  type ActiveStock,
  type XdPersistResult,
  type XdSyncRepository,
  type XdSyncRow
} from "../src/lib/market-data/settrade-xd-sync-service";

const stocks: ActiveStock[] = [
  { id: 1, symbol: "ADVANC" },
  { id: 2, symbol: "BBL" }
];

function dividend(
  overrides: Partial<NormalizedSettradeDividend> = {}
): NormalizedSettradeDividend {
  return {
    symbol: "ADVANC",
    name: "Advanced Info Service",
    xdDate: "2026-04-01",
    paymentDate: "2026-05-01",
    dividendAmount: 5.5,
    dividendType: "Settrade - Cash dividend",
    ...overrides
  };
}

class FakeRepository implements XdSyncRepository {
  readonly settings = new Map<string, string>();
  readonly stored = new Map<string, XdSyncRow>();

  constructor(private readonly activeStocks = stocks) {}

  async listActiveStocks() {
    return this.activeStocks;
  }

  async upsertDividends(rows: XdSyncRow[]): Promise<XdPersistResult> {
    let created = 0;
    let updated = 0;
    let unchanged = 0;
    for (const row of rows) {
      const key = `${row.stockId}:${row.xdDate.toISOString()}`;
      const existing = this.stored.get(key);
      if (!existing) {
        this.stored.set(key, row);
        created += 1;
      } else if (
        existing.paymentDate?.getTime() === row.paymentDate?.getTime() &&
        existing.dividendAmount === row.dividendAmount &&
        existing.dividendType === row.dividendType
      ) {
        unchanged += 1;
      } else {
        this.stored.set(key, row);
        updated += 1;
      }
    }
    return { created, updated, unchanged };
  }

  async setSetting(key: string, value: string) {
    this.settings.set(key, value);
  }
}

test("resolves a full year into 12 unique targets", () => {
  const targets = resolveXdSyncTargets(
    { fullYear: true, year: 2026 },
    new Date("2026-07-01T00:00:00.000Z")
  );
  assert.equal(targets.length, 12);
  assert.deepEqual(targets[0], { year: 2026, month: 1 });
  assert.deepEqual(targets[11], { year: 2026, month: 12 });
});

test("deduplicates identical source rows before persistence", () => {
  const prepared = prepareXdSyncRows([dividend(), dividend()], stocks);
  assert.equal(prepared.rows.length, 1);
  assert.equal(prepared.duplicateRows, 1);
  assert.equal(prepared.conflictingRows, 0);
});

test("rejects conflicting rows for the same stock and XD date", () => {
  const prepared = prepareXdSyncRows(
    [dividend(), dividend({ dividendAmount: 6.25 })],
    stocks
  );
  assert.equal(prepared.rows.length, 0);
  assert.equal(prepared.duplicateRows, 1);
  assert.equal(prepared.conflictingRows, 1);
  assert.match(prepared.warnings[0], /conflicting duplicate/);
});

test("rejects invalid dates, negative dividends and unknown stocks", () => {
  const prepared = prepareXdSyncRows(
    [
      dividend({ xdDate: "2026-02-30" }),
      dividend({ dividendAmount: -1 }),
      dividend({ symbol: "UNKNOWN" })
    ],
    stocks
  );
  assert.equal(prepared.rows.length, 0);
  assert.equal(prepared.rejectedRows, 3);
});

test("sync is idempotent and records successful sync timestamps", async () => {
  const repository = new FakeRepository();
  const now = new Date("2026-04-15T10:00:00.000Z");
  const dependencies = {
    repository,
    fetchCalendar: async () => [dividend()],
    now: () => now
  };
  const request = { months: [{ year: 2026, month: 4 }] };

  const first = await syncSettradeXdCalendar(request, dependencies);
  const second = await syncSettradeXdCalendar(request, dependencies);

  assert.equal(first.created, 1);
  assert.equal(first.updated, 0);
  assert.equal(second.created, 0);
  assert.equal(second.unchanged, 1);
  assert.equal(repository.stored.size, 1);
  assert.equal(repository.settings.get("last_settrade_xd_sync_at"), now.toISOString());
  assert.equal(
    repository.settings.get("last_settrade_xd_sync_attempt_at"),
    now.toISOString()
  );
});

test("partial source failure persists valid rows without advancing success timestamp", async () => {
  const repository = new FakeRepository();
  const now = new Date("2026-04-15T10:00:00.000Z");
  const result = await syncSettradeXdCalendar(
    {
      months: [
        { year: 2026, month: 4 },
        { year: 2026, month: 5 }
      ]
    },
    {
      repository,
      now: () => now,
      fetchCalendar: async ({ month }) => {
        if (month === 5) throw new Error("Settrade unavailable");
        return [dividend()];
      }
    }
  );

  assert.equal(result.ok, false);
  assert.equal(result.created, 1);
  assert.equal(result.errors.length, 1);
  assert.equal(repository.stored.size, 1);
  assert.equal(repository.settings.has("last_settrade_xd_sync_at"), false);
  assert.equal(
    repository.settings.get("last_settrade_xd_sync_attempt_at"),
    now.toISOString()
  );
});

test("rejects source rows returned outside the requested month", async () => {
  const repository = new FakeRepository();
  const result = await syncSettradeXdCalendar(
    { months: [{ year: 2026, month: 4 }] },
    {
      repository,
      fetchCalendar: async () => [dividend({ xdDate: "2026-05-01" })],
      now: () => new Date("2026-04-15T10:00:00.000Z")
    }
  );

  assert.equal(result.ok, false);
  assert.equal(result.rejectedRows, 1);
  assert.equal(result.accepted, 0);
  assert.equal(repository.stored.size, 0);
  assert.equal(repository.settings.has("last_settrade_xd_sync_at"), false);
});
