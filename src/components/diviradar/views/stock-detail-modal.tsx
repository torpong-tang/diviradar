import { CheckCircle2, CircleDollarSign, LineChart, ShieldCheck } from "lucide-react";
import { Modal } from "@/components/ui";
import { dateText, displayDividend, money, pct } from "@/components/diviradar/formatters";
import { Info, Metric } from "@/components/diviradar/metric";
import type { Stock } from "@/components/diviradar/types";

export function StockDetail({ stock, onClose }: { stock: Stock; onClose: () => void }) {
  const dividend = displayDividend(stock);
  const dividendRows = [...stock.dividends].filter((row) => row.xdDate || row.paymentDate || row.dividendAmount).sort((a, b) => String(b.xdDate || "").localeCompare(String(a.xdDate || "")));
  return (
    <Modal title={`${stock.symbol} • ${stock.name}`} onClose={onClose}>
      <div className="grid gap-4 md:grid-cols-3"><Metric label="ราคาล่าสุด" value={`${money(stock.latestPrice?.price || 0, 2)} ฿`} icon={LineChart} /><Metric label="Dividend Yield" value={pct(stock.radar.yieldPct)} icon={CircleDollarSign} accent="green" /><Metric label="Radar Score" value={`${stock.radar.score}/100`} icon={ShieldCheck} accent="gold" /></div>
      <div className="mt-6 rounded-3xl border border-sky-400/20 bg-white/5 p-5"><h3 className="mb-3 text-xl font-bold">เหตุผลที่ได้คะแนน</h3><ul className="space-y-2 text-slate-200">{stock.radar.reasons.map((reason) => <li key={reason} className="flex gap-2"><CheckCircle2 className="mt-1 text-gold" size={18} /> {reason}</li>)}</ul></div>
      <div className="mt-6 grid gap-4 md:grid-cols-2"><Info label="ปันผลล่าสุด/ปี" value={`${money(stock.dividendPerShare || 0, 2)} ฿`} /><Info label="Payment Date" value={dateText(dividend?.paymentDate)} /><Info label="ราคาเป้าหมายสะสม" value={`${money(stock.targetBuyPrice || 0, 2)} ฿`} /><Info label="Fair Zone" value={`${money(stock.fairPriceLow || 0, 2)} - ${money(stock.fairPriceHigh || 0, 2)} ฿`} /></div>
      <div className="mt-6 rounded-3xl border border-sky-400/20 bg-white/5 p-5">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between"><div><h3 className="text-xl font-extrabold text-white">ตารางปันผล</h3><p className="text-sm text-slate-400">ข้อมูลเดียวกับ Dividend Calendar สำหรับหุ้น {stock.symbol}</p></div><span className="rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-sm font-bold text-gold">{dividendRows.length} รายการ</span></div>
        <div className="table-wrap"><table><thead><tr><th>XD</th><th>Payment</th><th>Dividend</th><th>Type</th></tr></thead><tbody>{dividendRows.map((row) => <tr key={row.id}><td>{dateText(row.xdDate)}</td><td>{dateText(row.paymentDate)}</td><td>{money(row.dividendAmount || 0, 4)} ฿</td><td>{row.dividendType || "-"}</td></tr>)}{dividendRows.length === 0 && <tr><td colSpan={4} className="text-center text-slate-400">ยังไม่มีข้อมูลปันผล</td></tr>}</tbody></table></div>
      </div>
    </Modal>
  );
}
