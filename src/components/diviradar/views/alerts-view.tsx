import { Plus, Trash2 } from "lucide-react";
import type { AlertRow, Stock } from "@/components/diviradar/types";

export function Alerts(props: {
  alerts: AlertRow[];
  stocks: Stock[];
  form: { stockId: string; alertType: string; targetValue: string };
  setForm: (value: { stockId: string; alertType: string; targetValue: string }) => void;
  onAdd: () => void;
  onDelete: (row: AlertRow) => void;
}) {
  return (
    <div className="space-y-5"><div className="glass rounded-3xl p-5"><h2 className="mb-5 text-3xl font-extrabold">Smart Alert</h2><div className="grid gap-3 md:grid-cols-4"><select className="field" value={props.form.stockId} onChange={(event) => props.setForm({ ...props.form, stockId: event.target.value })}><option value="">เลือกหุ้น</option>{props.stocks.map((stock) => <option key={stock.id} value={stock.id}>{stock.symbol}</option>)}</select><select className="field" value={props.form.alertType} onChange={(event) => props.setForm({ ...props.form, alertType: event.target.value })}><option>Daily Radar</option><option>Buy Alert</option><option>XD Alert</option><option>Dividend Payment Alert</option><option>Portfolio Summary</option></select><input className="field" placeholder="Target value" type="number" value={props.form.targetValue} onChange={(event) => props.setForm({ ...props.form, targetValue: event.target.value })} /><button className="btn btn-green" onClick={props.onAdd}><Plus size={18} /> เพิ่ม Alert</button></div></div><div className="glass rounded-3xl p-5"><div className="grid gap-3">{props.alerts.map((alert) => <div key={alert.id} className="flex flex-col justify-between gap-3 rounded-2xl bg-white/5 p-4 sm:flex-row sm:items-center"><div><b>{alert.stock.symbol}</b> • {alert.alertType} • {alert.targetValue || "-"}</div><button className="btn btn-red !p-3" title="ลบ" onClick={() => props.onDelete(alert)}><Trash2 size={18} /></button></div>)}{props.alerts.length === 0 && <p className="text-slate-400">ยังไม่มี Alert</p>}</div></div></div>
  );
}
