import { LineChart } from "lucide-react";

export function Metric({
  label,
  value,
  icon: Icon,
  accent = "cyan"
}: {
  label: string;
  value: string;
  icon: typeof LineChart;
  accent?: "cyan" | "gold" | "green";
}) {
  const color = accent === "gold" ? "text-gold bg-gold/15" : accent === "green" ? "text-emerald-200 bg-emerald-400/15" : "text-cyan-200 bg-cyan-400/15";
  return (
    <div className="glass rounded-3xl p-5">
      <div className={`mb-5 inline-flex rounded-2xl p-3 ${color}`}><Icon /></div>
      <div className="text-3xl font-extrabold">{value}</div>
      <div className="mt-1 text-slate-400">{label}</div>
    </div>
  );
}

export function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-sky-400/20 bg-night/70 p-4">
      <div className="text-sm text-slate-400">{label}</div>
      <div className="mt-1 font-bold text-white">{value}</div>
    </div>
  );
}
