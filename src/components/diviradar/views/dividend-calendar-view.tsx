import { History, Loader2, RefreshCw } from "lucide-react";
import { Modal } from "@/components/ui";
import { dateText, dateTimeText, displayDividend, money } from "@/components/diviradar/formatters";
import { Info } from "@/components/diviradar/metric";
import { StatusPill } from "@/components/diviradar/status-pill";
import { XdHistoryMonthTable } from "@/components/diviradar/xd-history-month-table";
import type { DividendHistoryRow, Stock } from "@/components/diviradar/types";

export function DividendCalendar({ stocks, lastSyncAt, onUpdateXd, onHistory, historyBusySymbol }: {
  stocks: Stock[];
  lastSyncAt: string | null;
  onUpdateXd: () => void;
  onHistory: (stock: Stock) => void;
  historyBusySymbol: string | null;
}) {
  const rows = stocks.map((stock) => ({ stock, dividend: displayDividend(stock) })).filter((row): row is { stock: Stock; dividend: NonNullable<ReturnType<typeof displayDividend>> } => Boolean(row.dividend)).sort((a, b) => String(a.dividend.xdDate).localeCompare(String(b.dividend.xdDate)));
  return (
    <div className="glass rounded-3xl p-5">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="text-3xl font-extrabold">Dividend Calendar</h2><p className="mt-1 text-sm text-slate-400">Source: Settrade Stock Calendar • Last XD sync: <span className="font-bold text-gold">{dateTimeText(lastSyncAt)}</span></p></div><button className="btn btn-blue" onClick={onUpdateXd}><RefreshCw size={18} /> Update XD Calendar</button></div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {rows.map(({ stock, dividend }) => <div key={`${stock.id}-${dividend.id}`} className="rounded-3xl border border-sky-400/20 bg-white/5 p-5"><div className="flex items-center justify-between"><div className="text-2xl font-extrabold">{stock.symbol} <span className="text-lg font-bold text-slate-300">({money(stock.latestPrice?.price || 0, 2)} ฿)</span></div><StatusPill tone={stock.radar.tone} label={stock.radar.status} /></div><div className="mt-4 grid grid-cols-2 gap-3"><Info label="XD" value={dateText(dividend.xdDate)} /><Info label="Payment" value={dateText(dividend.paymentDate)} /><Info label="Dividend" value={`${money(dividend.dividendAmount || 0, 4)} ฿`} /><Info label="Type" value={dividend.dividendType || "-"} /></div><button className="btn btn-yellow mt-4 w-full" onClick={() => onHistory(stock)} disabled={historyBusySymbol === stock.symbol}>{historyBusySymbol === stock.symbol ? <Loader2 className="animate-spin" size={18} /> : <History size={18} />}ประวัติปันผล 4 ครั้งล่าสุด</button></div>)}
        {rows.length === 0 && <p className="text-slate-400">ยังไม่มีข้อมูล XD Calendar กด Update XD Calendar เพื่อดึงจาก Settrade</p>}
      </div>
      <XdHistoryMonthTable stocks={stocks} />
    </div>
  );
}

export function DividendHistoryModal({ data, onClose }: { data: { stock: Pick<Stock, "symbol" | "name">; rows: DividendHistoryRow[] }; onClose: () => void }) {
  return (
    <Modal title={`Dividend History • ${data.stock.symbol}`} onClose={onClose}>
      <div className="mb-5 rounded-3xl border border-gold/30 bg-gold/10 p-5"><div className="text-2xl font-extrabold text-gold">{data.stock.symbol}</div><p className="mt-1 text-slate-200">{data.stock.name}</p><p className="mt-2 text-sm text-slate-400">แสดงประวัติ XD จาก Settrade Stock Calendar 4 ครั้งล่าสุดที่บันทึกใน SQLite</p></div>
      <div className="table-wrap"><table><thead><tr><th>ครั้งที่</th><th>วันขึ้น XD</th><th>วันจ่าย</th><th>ปันผล/หุ้น</th><th>Source</th></tr></thead><tbody>{data.rows.map((row, index) => <tr key={row.id}><td className="font-bold text-gold">{index + 1}</td><td>{dateText(row.xdDate)}</td><td>{dateText(row.paymentDate)}</td><td>{money(row.dividendAmount || 0, 4)} ฿</td><td>{row.dividendType || "-"}</td></tr>)}{data.rows.length === 0 && <tr><td colSpan={5} className="text-center text-slate-400">ไม่พบประวัติปันผลจาก Settrade สำหรับหุ้นนี้</td></tr>}</tbody></table></div>
    </Modal>
  );
}
