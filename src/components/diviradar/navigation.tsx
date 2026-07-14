import {
  Bell,
  CalendarDays,
  CircleDollarSign,
  LineChart,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ShieldCheck,
  WalletCards
} from "lucide-react";

export const navItems = [
  { key: "dashboard", label: "Dashboard", icon: LineChart },
  { key: "watchlist", label: "Watchlist", icon: ShieldCheck },
  { key: "portfolio", label: "Portfolio", icon: WalletCards },
  { key: "calendar", label: "Dividend Calendar", icon: CalendarDays },
  { key: "dca", label: "DCA Plan", icon: CircleDollarSign },
  { key: "alerts", label: "Alerts", icon: Bell },
  { key: "settings", label: "Settings", icon: Settings }
] as const;

export type AppView = (typeof navItems)[number]["key"];

export function Sidebar({
  view,
  collapsed,
  onToggle,
  onSelect
}: {
  view: AppView;
  collapsed: boolean;
  onToggle: () => void;
  onSelect: (key: AppView) => void;
}) {
  return (
    <div className={`glass sticky top-32 h-fit rounded-3xl p-3 transition-all ${collapsed ? "w-[88px]" : "w-full"}`}>
      <div className={`mb-3 flex items-center gap-3 rounded-2xl bg-white/5 p-3 ${collapsed ? "justify-center" : "justify-between"}`}>
        {!collapsed && <div className="font-extrabold text-slate-200">Menu</div>}
        <button
          type="button"
          className="rounded-2xl bg-slate-700/80 p-3 text-slate-100 transition hover:bg-slate-600"
          title={collapsed ? "Expand menu" : "Collapse menu"}
          onClick={onToggle}
        >
          {collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
        </button>
      </div>
      <nav className="grid gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = view === item.key;
          return (
            <button
              key={item.key}
              title={item.label}
              onClick={() => onSelect(item.key)}
              className={`flex items-center rounded-2xl px-4 py-3 font-bold transition ${
                collapsed ? "justify-center" : "gap-3 text-left"
              } ${active ? "bg-gold text-night shadow-gold" : "text-slate-200 hover:bg-white/8"}`}
            >
              <Icon size={20} />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
