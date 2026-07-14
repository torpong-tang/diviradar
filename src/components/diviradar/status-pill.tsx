import { AlertTriangle, Hourglass, TrendingUp } from "lucide-react";
import type { RadarTone } from "@/components/diviradar/types";

export function StatusPill({ tone, label }: { tone: RadarTone; label: string }) {
  const config = tone === "green"
    ? { icon: TrendingUp, className: "border-emerald-300/35 bg-white/8 text-emerald-300 shadow-[0_0_22px_rgba(52,211,153,0.16)]" }
    : tone === "yellow"
      ? { icon: Hourglass, className: "border-gold/45 bg-white/8 text-gold shadow-[0_0_22px_rgba(251,191,36,0.18)]" }
      : { icon: AlertTriangle, className: "border-rose-300/35 bg-white/8 text-rose-300 shadow-[0_0_22px_rgba(244,63,94,0.16)]" };
  const Icon = config.icon;
  return (
    <span title={label} aria-label={label} className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl border backdrop-blur-md ${config.className}`}>
      <Icon size={17} />
    </span>
  );
}
