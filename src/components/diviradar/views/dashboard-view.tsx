import { CircleDollarSign, LineChart, ShieldCheck, WalletCards } from "lucide-react";
import { Metric } from "@/components/diviradar/metric";
import { money, pct } from "@/components/diviradar/formatters";
import type { Bootstrap, Stock } from "@/components/diviradar/types";

function RadarBucket({ title, rows }: { title: string; rows: Stock[] }) {
  return (
    <div className="glass rounded-3xl p-5">
      <h3 className="mb-4 text-xl font-extrabold">{title}</h3>
      <div className="space-y-3">
        {rows.slice(0, 5).map((stock) => (
          <div key={stock.id} className="flex items-center justify-between rounded-2xl bg-white/5 p-3">
            <div><div className="font-bold">{stock.symbol}</div><div className="text-sm text-slate-400">{stock.sector}</div></div>
            <div className="text-right">
              <div className="font-bold text-white">{money(stock.latestPrice?.price || 0, 2)} ฿</div>
              <div className="text-sm font-bold text-gold">Score {stock.radar.score}</div>
              <div className="text-sm text-slate-400">Yield {pct(stock.radar.yieldPct)}</div>
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="text-slate-400">ไม่มีรายการ</p>}
      </div>
    </div>
  );
}

export function Dashboard({ data, buy, wait, expensive }: { data: Bootstrap; buy: Stock[]; wait: Stock[]; expensive: Stock[] }) {
  return (
    <div className="space-y-6">
      <div className="glass rounded-3xl p-6">
        <p className="text-gold">Dividend Copilot วันนี้</p>
        <h2 className="mt-2 text-3xl font-extrabold">หุ้นน่าสนใจวันนี้: {buy.slice(0, 3).map((stock) => stock.symbol).join(", ") || "ยังไม่มีสัญญาณซื้อชัดเจน"}</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric label="หุ้นใน Watchlist" value={`${data.summary.watchlistCount}`} icon={ShieldCheck} />
        <Metric label="หุ้นเข้าโซนสะสม" value={`${data.summary.buyZoneCount}`} icon={LineChart} accent="green" />
        <Metric label="มูลค่าพอร์ต" value={`${money(data.summary.portfolioValue)} ฿`} icon={WalletCards} accent="gold" />
        <Metric label="ปันผล/เดือน" value={`${money(data.summary.monthlyDividend)} ฿`} icon={CircleDollarSign} accent="green" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <RadarBucket title="🟢 น่าสะสม" rows={buy} />
        <RadarBucket title="🟡 รอดู" rows={wait} />
        <RadarBucket title="🔴 รอราคาย่อ" rows={expensive} />
      </div>
    </div>
  );
}
