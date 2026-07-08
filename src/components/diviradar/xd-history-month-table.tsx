"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Filter, Search } from "lucide-react";
import type { Stock } from "@/components/diviradar/types";
import { dateText, money } from "@/components/diviradar/formatters";

const thaiMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

type XdEntry = {
  key: string;
  symbol: string;
  name: string;
  sector: string;
  month: number;
  year: number;
  xdDate: string;
  paymentDate: string | null;
  dividendAmount: number;
  dividendType: string | null;
};

function parseXdDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

export function XdHistoryMonthTable({ stocks }: { stocks: Stock[] }) {
  const [query, setQuery] = useState("");
  const [year, setYear] = useState("all");
  const [sector, setSector] = useState("all");

  const entries = useMemo<XdEntry[]>(
    () =>
      stocks
        .flatMap((stock) =>
          stock.dividends.map((dividend) => {
            const xdDate = parseXdDate(dividend.xdDate);
            if (!xdDate) return null;
            return {
              key: `${stock.id}-${dividend.id}`,
              symbol: stock.symbol,
              name: stock.name,
              sector: stock.sector || "-",
              month: xdDate.getMonth(),
              year: xdDate.getFullYear(),
              xdDate: dividend.xdDate || "",
              paymentDate: dividend.paymentDate,
              dividendAmount: dividend.dividendAmount || 0,
              dividendType: dividend.dividendType || null
            };
          })
        )
        .filter((entry): entry is XdEntry => Boolean(entry))
        .sort((a, b) => new Date(a.xdDate).getTime() - new Date(b.xdDate).getTime()),
    [stocks]
  );

  const years = useMemo(
    () => Array.from(new Set(entries.map((entry) => entry.year))).sort((a, b) => b - a),
    [entries]
  );

  const sectors = useMemo(
    () => Array.from(new Set(entries.map((entry) => entry.sector))).sort((a, b) => a.localeCompare(b)),
    [entries]
  );

  const filteredEntries = useMemo(() => {
    const term = query.trim().toLowerCase();
    return entries.filter((entry) => {
      const matchesQuery =
        !term ||
        entry.symbol.toLowerCase().includes(term) ||
        entry.name.toLowerCase().includes(term) ||
        entry.dividendType?.toLowerCase().includes(term);
      const matchesYear = year === "all" || entry.year === Number(year);
      const matchesSector = sector === "all" || entry.sector === sector;
      return matchesQuery && matchesYear && matchesSector;
    });
  }, [entries, query, sector, year]);

  const groupedByMonth = useMemo(
    () =>
      thaiMonths.map((_, month) =>
        filteredEntries
          .filter((entry) => entry.month === month)
          .sort((a, b) => a.symbol.localeCompare(b.symbol) || new Date(a.xdDate).getTime() - new Date(b.xdDate).getTime())
      ),
    [filteredEntries]
  );

  const rowCount = Math.max(1, ...groupedByMonth.map((items) => items.length));

  return (
    <div className="mt-6 rounded-3xl border border-sky-400/20 bg-white/5 p-5">
      <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-2xl border border-gold/30 bg-gold/10 px-4 py-2 text-gold">
            <CalendarDays size={18} />
            <span className="font-extrabold">XD History by Month</span>
          </div>
          <p className="mt-2 text-sm text-slate-400">แสดงหุ้นตามเดือนขึ้น XD จากข้อมูลปันผลที่บันทึกใน SQLite</p>
        </div>
        <div className="grid gap-3 md:grid-cols-3 xl:min-w-[760px]">
          <label className="field flex items-center gap-3">
            <Search size={18} className="text-slate-400" />
            <input
              className="w-full bg-transparent outline-none"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ค้นหาหุ้น / ชื่อ / ประเภท"
            />
          </label>
          <label className="field flex items-center gap-3">
            <Filter size={18} className="text-slate-400" />
            <select className="w-full bg-transparent outline-none" value={year} onChange={(event) => setYear(event.target.value)}>
              <option value="all">ทุกปี</option>
              {years.map((item) => (
                <option key={item} value={item}>
                  {item + 543}
                </option>
              ))}
            </select>
          </label>
          <select className="field" value={sector} onChange={(event) => setSector(event.target.value)}>
            <option value="all">ทุกกลุ่มอุตสาหกรรม</option>
            {sectors.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-3 text-center font-extrabold text-gold">พบรายการ XD ทั้งหมด {filteredEntries.length} รายการ</div>
      <div className="overflow-x-auto rounded-2xl border border-sky-400/20">
        <table className="min-w-[1180px] border-collapse text-center">
          <thead>
            <tr>
              <th colSpan={12} className="border border-sky-300/25 bg-gold px-4 py-3 text-lg font-extrabold text-night">
                XD History by Month
              </th>
            </tr>
            <tr>
              {thaiMonths.map((month) => (
                <th key={month} className="border border-sky-300/20 bg-amber-700/80 px-3 py-2 text-night">
                  {month}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rowCount }).map((_, rowIndex) => (
              <tr key={rowIndex}>
                {groupedByMonth.map((items, monthIndex) => {
                  const entry = items[rowIndex];
                  return (
                    <td key={`${monthIndex}-${rowIndex}`} className="h-16 border border-sky-300/15 bg-slate-300/10 px-2 py-2 align-top">
                      {entry ? (
                        <div
                          title={`${entry.symbol} • XD ${dateText(entry.xdDate)} • Payment ${dateText(entry.paymentDate)} • ${money(entry.dividendAmount, 4)} ฿`}
                          className="mx-auto inline-flex max-w-full flex-col rounded-xl border border-cyan-300/25 bg-night/85 px-3 py-2 text-left shadow-[0_0_18px_rgba(34,211,238,0.12)]"
                        >
                          <span className="truncate text-base font-extrabold text-white">
                            {entry.symbol} <span className="text-sm text-gold">({money(entry.dividendAmount, 4)} ฿)</span>
                          </span>
                          <span className="truncate text-xs text-slate-400">{dateText(entry.xdDate)}</span>
                        </div>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
