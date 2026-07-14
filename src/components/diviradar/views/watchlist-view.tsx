"use client";

import { useState } from "react";
import { Eye, Search } from "lucide-react";
import { money, pct, sortIcon } from "@/components/diviradar/formatters";
import { StatusPill } from "@/components/diviradar/status-pill";
import type { SortDirection, Stock, WatchlistSortKey } from "@/components/diviradar/types";

export function Watchlist(props: {
  rows: Stock[];
  query: string;
  sector: string;
  status: string;
  sectors: string[];
  onQuery: (value: string) => void;
  onSector: (value: string) => void;
  onStatus: (value: string) => void;
  onSelect: (stock: Stock) => void;
}) {
  const [sortKey, setSortKey] = useState<WatchlistSortKey>("score");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const changeSort = (key: WatchlistSortKey) => {
    if (sortKey === key) setSortDirection((value) => (value === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDirection(key === "symbol" || key === "status" ? "asc" : "desc");
    }
  };
  const sortedRows = [...props.rows].sort((a, b) => {
    const getValue = (stock: Stock) => {
      if (sortKey === "symbol") return stock.symbol;
      if (sortKey === "price") return stock.latestPrice?.price || 0;
      if (sortKey === "yield") return stock.radar.yieldPct || 0;
      if (sortKey === "score") return stock.radar.score || 0;
      return stock.radar.status || "";
    };
    const left = getValue(a);
    const right = getValue(b);
    const result = typeof left === "string" && typeof right === "string" ? left.localeCompare(right) : Number(left) - Number(right);
    return sortDirection === "asc" ? result : -result;
  });
  const SortHeader = ({ column, label }: { column: WatchlistSortKey; label: string }) => (
    <button type="button" className="inline-flex items-center gap-2 font-extrabold uppercase text-slate-300 hover:text-gold" onClick={() => changeSort(column)}>
      {label}<span className={sortKey === column ? "text-gold" : "text-slate-500"}>{sortIcon(sortKey === column, sortDirection)}</span>
    </button>
  );

  return (
    <div className="glass rounded-3xl p-5">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
        <h2 className="flex-1 text-3xl font-extrabold">Watchlist</h2>
        <div className="relative min-w-72"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} /><input className="field pl-12" placeholder="Live Search..." value={props.query} onChange={(event) => props.onQuery(event.target.value)} /></div>
        <select className="field lg:w-56" value={props.sector} onChange={(event) => props.onSector(event.target.value)}>{props.sectors.map((sector) => <option key={sector} value={sector}>{sector === "all" ? "All Sectors" : sector}</option>)}</select>
        <select className="field lg:w-56" value={props.status} onChange={(event) => props.onStatus(event.target.value)}><option value="all">All Statuses</option><option value="green">น่าสะสม</option><option value="yellow">รอดู</option><option value="red">แพง / ยังไม่เหมาะ</option></select>
      </div>
      <div className="table-wrap"><table><thead><tr><th><SortHeader column="symbol" label="หุ้น" /></th><th><SortHeader column="price" label="ราคา" /></th><th><SortHeader column="yield" label="Yield" /></th><th><SortHeader column="score" label="Score" /></th><th><SortHeader column="status" label="สถานะ" /></th><th>Action</th></tr></thead><tbody>
        {sortedRows.map((stock) => <tr key={stock.id}><td><div className="font-bold text-white">{stock.symbol}</div><div className="text-sm text-slate-400">{stock.name}</div></td><td>{money(stock.latestPrice?.price || 0, 2)}</td><td>{pct(stock.radar.yieldPct)}</td><td className="font-extrabold text-gold">{stock.radar.score}</td><td><StatusPill tone={stock.radar.tone} label={stock.radar.status} /></td><td><button className="btn btn-blue !p-3" title="ดูรายละเอียด" onClick={() => props.onSelect(stock)}><Eye size={18} /></button></td></tr>)}
      </tbody></table></div>
    </div>
  );
}
