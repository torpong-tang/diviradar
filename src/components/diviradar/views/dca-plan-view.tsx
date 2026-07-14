"use client";

import { useCallback, useEffect, useState } from "react";
import { Calculator } from "lucide-react";
import { Info } from "@/components/diviradar/metric";
import { money } from "@/components/diviradar/formatters";
import { buildDcaPlan, type DcaPlanItem } from "@/lib/dca/dca-plan";
import type { Bootstrap } from "@/components/diviradar/types";

export function DcaPlan({ data }: { data: Bootstrap }) {
  const [dcaAmount, setDcaAmount] = useState(String(data.summary.dcaAmount || 0));
  const [calculatedAmount, setCalculatedAmount] = useState(Number(data.summary.dcaAmount || 0));
  const [calculatedPlan, setCalculatedPlan] = useState<DcaPlanItem[]>([]);
  const [error, setError] = useState("");
  const buildPlan = useCallback((amount: number) => buildDcaPlan(data.radar.map((stock) => ({ symbol: stock.symbol, name: stock.name, score: stock.radar.score, price: stock.latestPrice?.price || 0 })), amount), [data.radar]);
  useEffect(() => { const amount = Number(data.summary.dcaAmount || 0); setDcaAmount(String(amount)); setCalculatedAmount(amount); setCalculatedPlan(buildPlan(amount)); setError(""); }, [buildPlan, data.summary.dcaAmount]);
  const calculatePlan = () => { const amount = Number(dcaAmount); if (!Number.isFinite(amount) || amount <= 0) { setError("กรุณากรอกงบ DCA รายเดือนให้มากกว่า 0 บาท"); setCalculatedPlan([]); return; } setCalculatedAmount(amount); setCalculatedPlan(buildPlan(amount)); setError(""); };
  return (
    <div className="space-y-5">
      <div className="glass rounded-3xl p-5"><div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between"><div><h2 className="text-3xl font-extrabold">DCA Plan</h2><p className="mt-2 text-slate-300">กรอกงบรายเดือน แล้วกดคำนวณเพื่อจัดสัดส่วนหุ้นจาก Radar Score สูงสุด</p></div><div className="grid gap-3 md:grid-cols-[minmax(260px,420px)_auto]"><label className="block"><span className="mb-2 block text-slate-300">DCA รายเดือน</span><input className="field" inputMode="decimal" min="0" type="number" value={dcaAmount} onChange={(event) => setDcaAmount(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") calculatePlan(); }} /></label><button className="btn btn-yellow self-end" onClick={calculatePlan}><Calculator size={18} /> คำนวณแผน DCA</button></div></div>{error && <div className="mt-4 rounded-2xl border border-rose-400/40 bg-rose-500/10 p-4 font-bold text-rose-200">{error}</div>}<div className="mt-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4 text-sm text-cyan-50">ยอดที่ใช้คำนวณล่าสุด: <span className="font-extrabold text-gold">{money(calculatedAmount)} บาท</span></div></div>
      <div className="glass rounded-3xl p-5"><div className="grid gap-4 md:grid-cols-3">{calculatedPlan.map((row) => <div key={row.symbol} className="rounded-3xl border border-gold/30 bg-gold/10 p-5"><div className="flex items-start justify-between gap-3"><div><div className="text-3xl font-extrabold text-gold">{row.symbol}</div><p className="mt-1 text-slate-300">{row.name}</p></div><span className={`rounded-full border px-3 py-1 text-xs font-bold ${row.isWithinTolerance ? "border-emerald-300/40 bg-emerald-400/10 text-emerald-200" : "border-rose-300/40 bg-rose-400/10 text-rose-200"}`}>{row.isWithinTolerance ? "±5%" : "เกิน 5%"}</span></div><div className="mt-5 text-sm text-slate-400">งบจัดสรร</div><div className="text-2xl font-bold">{money(row.amount)} บาท</div><div className="mt-4 grid grid-cols-2 gap-3"><Info label="ราคา/หุ้น" value={row.price > 0 ? `${money(row.price, 2)} ฿` : "ไม่มีราคา"} /><Info label="จำนวนหุ้น" value={row.shares > 0 ? `${money(row.shares)} หุ้น` : "-"} /><Info label="ราคารวม" value={row.actualAmount > 0 ? `${money(row.actualAmount, 2)} ฿` : "-"} /><Info label="ส่วนต่าง" value={row.shares > 0 ? `${row.variancePct >= 0 ? "+" : ""}${row.variancePct.toFixed(2)}%` : "-"} /></div>{!row.isWithinTolerance && <p className="mt-3 rounded-2xl border border-rose-300/30 bg-rose-400/10 p-3 text-sm text-rose-100">จำนวนหุ้นแบบ lot 100 ยังไม่อยู่ในกรอบขาด/เกิน 5% ของงบจัดสรร</p>}<p className="mt-4 text-sm text-slate-400">Score {row.score}/100</p></div>)}{calculatedPlan.length === 0 && !error && <p className="text-slate-400">ยังไม่มีหุ้น Score มากกว่า 80 แนะนำให้ถือเงินสดบางส่วน</p>}</div></div>
    </div>
  );
}
