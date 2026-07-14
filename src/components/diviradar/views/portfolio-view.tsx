import { Plus, Trash2 } from "lucide-react";
import { money, pct } from "@/components/diviradar/formatters";
import type { PortfolioRow, Stock } from "@/components/diviradar/types";

export function Portfolio(props: {
  rows: PortfolioRow[];
  stocks: Stock[];
  form: { stockId: string; shares: string; avgCost: string; note: string };
  setForm: (value: { stockId: string; shares: string; avgCost: string; note: string }) => void;
  onAdd: () => void;
  onDelete: (row: PortfolioRow) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="glass rounded-3xl p-5"><h2 className="mb-5 text-3xl font-extrabold">Portfolio</h2><div className="grid gap-3 md:grid-cols-5">
        <select className="field" value={props.form.stockId} onChange={(event) => props.setForm({ ...props.form, stockId: event.target.value })}><option value="">เลือกหุ้น</option>{props.stocks.map((stock) => <option key={stock.id} value={stock.id}>{stock.symbol}</option>)}</select>
        <input className="field" placeholder="จำนวนหุ้น" type="number" value={props.form.shares} onChange={(event) => props.setForm({ ...props.form, shares: event.target.value })} />
        <input className="field" placeholder="ต้นทุนเฉลี่ย" type="number" value={props.form.avgCost} onChange={(event) => props.setForm({ ...props.form, avgCost: event.target.value })} />
        <input className="field" placeholder="Note" value={props.form.note} onChange={(event) => props.setForm({ ...props.form, note: event.target.value })} />
        <button className="btn btn-green" onClick={props.onAdd}><Plus size={18} /> เพิ่ม</button>
      </div></div>
      <div className="glass rounded-3xl p-5"><div className="table-wrap"><table><thead><tr><th>หุ้น</th><th>จำนวน</th><th>ต้นทุน</th><th>ราคาปัจจุบัน</th><th>กำไร/ขาดทุน</th><th>ปันผล/ปี</th><th>Yield on Cost</th><th>Action</th></tr></thead><tbody>
        {props.rows.map((row) => <tr key={row.id}><td className="font-bold text-white">{row.stock.symbol}</td><td>{money(row.shares)}</td><td>{money(row.avgCost, 2)}</td><td>{money(row.currentPrice, 2)}</td><td className={row.gainLoss >= 0 ? "text-emerald-300" : "text-rose-300"}>{money(row.gainLoss)} ({pct(row.gainLossPct)})</td><td>{money(row.estimatedDividend)}</td><td>{pct(row.yieldOnCost)}</td><td><button className="btn btn-red !p-3" title="ลบ" onClick={() => props.onDelete(row)}><Trash2 size={18} /></button></td></tr>)}
      </tbody></table></div></div>
    </div>
  );
}
