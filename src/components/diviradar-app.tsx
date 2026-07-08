"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CircleDollarSign,
  Eye,
  History,
  Hourglass,
  LineChart,
  Loader2,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  PieChart,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  TrendingUp,
  Trash2,
  WalletCards,
  AlertTriangle
} from "lucide-react";
import { ConfirmModal, Modal, Spinner } from "@/components/ui";
import { api } from "@/components/diviradar/client-api";
import { dateText, dateTimeText, displayDividend, money, pct, sortIcon } from "@/components/diviradar/formatters";
import { LoginView } from "@/components/diviradar/login-view";
import { XdHistoryMonthTable } from "@/components/diviradar/xd-history-month-table";
import type {
  AlertRow,
  Bootstrap,
  DividendHistoryRow,
  PortfolioRow,
  RadarTone,
  SettingsForm,
  SortDirection,
  Stock,
  WatchlistSortKey
} from "@/components/diviradar/types";

const nav = [
  { key: "dashboard", label: "Dashboard", icon: LineChart },
  { key: "watchlist", label: "Watchlist", icon: ShieldCheck },
  { key: "portfolio", label: "Portfolio", icon: WalletCards },
  { key: "calendar", label: "Dividend Calendar", icon: CalendarDays },
  { key: "dca", label: "DCA Plan", icon: CircleDollarSign },
  { key: "alerts", label: "Alerts", icon: Bell },
  { key: "settings", label: "Settings", icon: Settings }
] as const;

const cronDays = [
  { value: "1", short: "Mon", label: "จันทร์" },
  { value: "2", short: "Tue", label: "อังคาร" },
  { value: "3", short: "Wed", label: "พุธ" },
  { value: "4", short: "Thu", label: "พฤหัส" },
  { value: "5", short: "Fri", label: "ศุกร์" },
  { value: "6", short: "Sat", label: "เสาร์" },
  { value: "0", short: "Sun", label: "อาทิตย์" }
];

function StatusPill({ tone, label }: { tone: RadarTone; label: string }) {
  const config =
    tone === "green"
      ? {
          icon: TrendingUp,
          className: "border-emerald-300/35 bg-white/8 text-emerald-300 shadow-[0_0_22px_rgba(52,211,153,0.16)]"
        }
      : tone === "yellow"
        ? {
            icon: Hourglass,
            className: "border-gold/45 bg-white/8 text-gold shadow-[0_0_22px_rgba(251,191,36,0.18)]"
          }
        : {
            icon: AlertTriangle,
            className: "border-rose-300/35 bg-white/8 text-rose-300 shadow-[0_0_22px_rgba(244,63,94,0.16)]"
          };
  const Icon = config.icon;
  return (
    <span
      title={label}
      aria-label={label}
      className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl border backdrop-blur-md ${config.className}`}
    >
      <Icon size={17} />
    </span>
  );
}

export function DiviRadarApp() {
  const [data, setData] = useState<Bootstrap | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<(typeof nav)[number]["key"]>("dashboard");
  const [login, setLogin] = useState({ email: "torpong.t@gmail.com", password: "" });
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("all");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<Stock | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [historyBusySymbol, setHistoryBusySymbol] = useState<string | null>(null);
  const [historyModal, setHistoryModal] = useState<{ stock: Pick<Stock, "symbol" | "name">; rows: DividendHistoryRow[] } | null>(null);
  const [portfolioForm, setPortfolioForm] = useState({ stockId: "", shares: "", avgCost: "", note: "" });
  const [alertForm, setAlertForm] = useState({ stockId: "", alertType: "Buy Alert", targetValue: "" });
  const [settingsForm, setSettingsForm] = useState<SettingsForm>({
    monthly_dca_amount: "20000",
    auto_price_update_enabled: "false",
    price_cron_days: "1,2,3,4,5",
    price_cron_times: "10:30,12:30,16:45,18:00",
    cron_time_tolerance_minutes: "3",
    line_notify_enabled: "false",
    line_channel_token: "",
    line_target_id: "",
    lineUserId: ""
  });
  const [confirm, setConfirm] = useState<{ title: string; message: string; action: () => Promise<void>; danger?: boolean } | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      const payload = await api<Bootstrap>("/api/bootstrap");
      setData(payload);
      setSettingsForm({
        monthly_dca_amount: payload.settings.find((x) => x.key === "monthly_dca_amount")?.value || "20000",
        auto_price_update_enabled: payload.settings.find((x) => x.key === "auto_price_update_enabled")?.value || "false",
        price_cron_days: payload.settings.find((x) => x.key === "price_cron_days")?.value || "1,2,3,4,5",
        price_cron_times: payload.settings.find((x) => x.key === "price_cron_times")?.value || "10:30,12:30,16:45,18:00",
        cron_time_tolerance_minutes: payload.settings.find((x) => x.key === "cron_time_tolerance_minutes")?.value || "3",
        line_notify_enabled: payload.settings.find((x) => x.key === "line_notify_enabled")?.value || "false",
        line_channel_token: payload.settings.find((x) => x.key === "line_channel_token")?.value || "",
        line_target_id: payload.settings.find((x) => x.key === "line_target_id")?.value || "",
        lineUserId: payload.user.lineUserId || ""
      });
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const doLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/login", { method: "POST", body: JSON.stringify(login) });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    await api("/api/logout", { method: "POST" });
    setData(null);
  };

  const sectors = useMemo(() => ["all", ...Array.from(new Set(data?.radar.map((x) => x.sector) || []))], [data]);
  const filtered = useMemo(() => {
    return (data?.radar || []).filter((stock) => {
      const haystack = `${stock.symbol} ${stock.name} ${stock.sector}`.toLowerCase();
      const matchesQuery = haystack.includes(query.toLowerCase());
      const matchesSector = sector === "all" || stock.sector === sector;
      const matchesStatus = status === "all" || stock.radar.tone === status;
      return matchesQuery && matchesSector && matchesStatus;
    });
  }, [data, query, sector, status]);

  const runConfirm = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      await confirm.action();
      setConfirm(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  };

  const openDividendHistory = async (stock: Stock) => {
    setHistoryBusySymbol(stock.symbol);
    setError("");
    try {
      const payload = await api<{ stock: Pick<Stock, "symbol" | "name">; dividends: DividendHistoryRow[] }>(
        "/api/dividends/settrade/history",
        { method: "POST", body: JSON.stringify({ symbol: stock.symbol, yearsBack: 6 }) }
      );
      setHistoryModal({ stock: payload.stock, rows: payload.dividends });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load dividend history");
    } finally {
      setHistoryBusySymbol(null);
    }
  };

  if (loading && !data) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="glass w-full max-w-lg rounded-3xl p-8 text-center">
          <Spinner label="กำลังโหลด DiviRadar..." />
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <LoginView busy={busy} error={error} login={login} onLoginChange={setLogin} onSubmit={doLogin} />
    );
  }

  const buy = data.radar.filter((x) => x.radar.score >= 80).sort((a, b) => b.radar.score - a.radar.score);
  const wait = data.radar.filter((x) => x.radar.score >= 60 && x.radar.score < 80);
  const expensive = data.radar.filter((x) => x.radar.score < 60);

  return (
    <main className="min-h-screen pb-10">
      <header className="sticky top-0 z-30 border-b border-sky-400/20 bg-night/88 px-4 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="flex flex-1 items-center gap-3">
            <button
              type="button"
              className="btn btn-gray !p-3 lg:hidden"
              title="Open menu"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu size={22} />
            </button>
            <div className="rounded-2xl bg-gold p-3 text-night shadow-gold">
              <PieChart />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold">DiviRadar</h1>
              <p className="text-sm text-slate-300">วันนี้ควรซื้อหุ้นปันผลตัวไหน เพราะอะไร</p>
            </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="btn btn-blue"
                onClick={() =>
                  setConfirm({
                    title: "อัปเดตราคาหุ้น",
                    message: "ดึงราคาล่าสุดจาก Yahoo Finance สำหรับหุ้นใน Watchlist ทั้งหมด? การอัปเดตด้วยปุ่มนี้จะแสดงผลเฉพาะใน app และไม่ส่ง LINE OA",
                    action: async () => {
                      await api("/api/prices/update", { method: "POST", body: "{}" });
                    }
                  })
                }
              >
                <RefreshCw size={18} /> Update Prices
              </button>
              <button className="btn btn-gray" onClick={logout}>
                <LogOut size={18} /> Logout
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-2 rounded-2xl border border-sky-400/20 bg-white/5 px-4 py-3 text-sm text-slate-200 md:flex-row md:items-center md:justify-between">
            <div>
              <span className="text-slate-400">Latest price data time:</span>{" "}
              <span className="font-bold text-gold">{dateTimeText(data.summary.lastPriceUpdatedAt)}</span>
            </div>
            <div className="min-w-0">
              <span className="text-slate-400">Signed in:</span>{" "}
              <span className="font-bold text-white">{data.user.email}</span>
            </div>
          </div>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-black/70 p-4 backdrop-blur-sm lg:hidden" onClick={() => setMobileMenuOpen(false)}>
          <div className="max-w-80" onClick={(event) => event.stopPropagation()}>
            <Sidebar
              view={view}
              collapsed={false}
              onToggle={() => setMobileMenuOpen(false)}
              onSelect={(key) => {
                setView(key);
                setMobileMenuOpen(false);
              }}
            />
          </div>
        </div>
      )}

      <div className={`mx-auto grid max-w-7xl gap-6 px-4 py-6 ${sidebarCollapsed ? "lg:grid-cols-[88px_1fr]" : "lg:grid-cols-[260px_1fr]"}`}>
        <aside className="hidden lg:block">
          <Sidebar
            view={view}
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed((value) => !value)}
            onSelect={setView}
          />
        </aside>

        <section className="space-y-6">
          {error && <div className="rounded-2xl border border-rose-400/30 bg-rose-500/12 p-4 text-rose-100">{error}</div>}
          {loading && <Spinner label="กำลังโหลดข้อมูลล่าสุด..." />}
          {view === "dashboard" && <Dashboard data={data} buy={buy} wait={wait} expensive={expensive} />}
          {view === "watchlist" && (
            <Watchlist
              rows={filtered}
              query={query}
              sector={sector}
              status={status}
              sectors={sectors}
              onQuery={setQuery}
              onSector={setSector}
              onStatus={setStatus}
              onSelect={setSelected}
            />
          )}
          {view === "portfolio" && (
            <Portfolio
              rows={data.portfolioRows}
              stocks={data.radar}
              form={portfolioForm}
              setForm={setPortfolioForm}
              onAdd={() =>
                setConfirm({
                  title: "เพิ่มรายการพอร์ต",
                  message: "ยืนยันเพิ่มหุ้นรายการนี้ในพอร์ตจริง?",
                  action: async () => {
                    await api("/api/portfolio", { method: "POST", body: JSON.stringify(portfolioForm) });
                    setPortfolioForm({ stockId: "", shares: "", avgCost: "", note: "" });
                  }
                })
              }
              onDelete={(row) =>
                setConfirm({
                  title: "ลบรายการพอร์ต",
                  message: `ต้องการลบ ${row.stock.symbol} ออกจากพอร์ต?`,
                  danger: true,
                  action: async () => {
                    await api(`/api/portfolio/${row.id}`, { method: "DELETE" });
                  }
                })
              }
            />
          )}
          {view === "calendar" && (
            <DividendCalendar
              stocks={data.radar}
              lastSyncAt={data.summary.lastSettradeXdSyncAt}
              onUpdateXd={() =>
                setConfirm({
                  title: "อัปเดต XD Calendar",
                  message: "ดึงข้อมูล XD จาก Settrade Stock Calendar สำหรับหุ้นใน Watchlist และบันทึกลงฐานข้อมูล?",
                  action: async () => {
                    await api("/api/dividends/settrade/update", { method: "POST", body: JSON.stringify({ fullYear: true }) });
                  }
                })
              }
              onHistory={openDividendHistory}
              historyBusySymbol={historyBusySymbol}
            />
          )}
          {view === "dca" && <DcaPlan data={data} />}
          {view === "alerts" && (
            <Alerts
              alerts={data.alerts}
              stocks={data.radar}
              form={alertForm}
              setForm={setAlertForm}
              onAdd={() =>
                setConfirm({
                  title: "เพิ่ม Alert",
                  message: "ยืนยันเพิ่มเงื่อนไขแจ้งเตือนนี้?",
                  action: async () => {
                    await api("/api/alerts", { method: "POST", body: JSON.stringify(alertForm) });
                    setAlertForm({ stockId: "", alertType: "Buy Alert", targetValue: "" });
                  }
                })
              }
              onDelete={(alert) =>
                setConfirm({
                  title: "ลบ Alert",
                  message: `ลบ Alert ของ ${alert.stock.symbol}?`,
                  danger: true,
                  action: async () => {
                    await api(`/api/alerts/${alert.id}`, { method: "DELETE" });
                  }
                })
              }
            />
          )}
          {view === "settings" && (
            <SettingsView
              form={settingsForm}
              setForm={setSettingsForm}
              logs={data.notificationLogs}
              onSave={() =>
                setConfirm({
                  title: "บันทึก Settings",
                  message: "ยืนยันบันทึกค่า DCA และ LINE OA settings?",
                  action: async () => {
                    await api("/api/settings", {
                      method: "PUT",
                      body: JSON.stringify({
                        lineUserId: settingsForm.lineUserId,
                        settings: {
                          monthly_dca_amount: settingsForm.monthly_dca_amount,
                          auto_price_update_enabled: settingsForm.auto_price_update_enabled,
                          price_cron_days: settingsForm.price_cron_days,
                          price_cron_times: settingsForm.price_cron_times,
                          cron_time_tolerance_minutes: settingsForm.cron_time_tolerance_minutes,
                          line_notify_enabled: settingsForm.line_notify_enabled,
                          line_channel_token: settingsForm.line_channel_token,
                          line_target_id: settingsForm.line_target_id
                        }
                      })
                    });
                  }
                })
              }
              onTestLine={() =>
                setConfirm({
                  title: "ทดสอบ LINE OA",
                  message: "ส่งข้อความทดสอบไปยัง LINE Target ID ที่ตั้งค่าไว้?",
                  action: async () => {
                    await api("/api/line/push", {
                      method: "POST",
                      body: JSON.stringify({ title: "DiviRadar Test", message: "ทดสอบแจ้งเตือนหุ้นปันผลจาก DiviRadar", force: true })
                    });
                  }
                })
              }
            />
          )}
        </section>
      </div>

      <footer className="mx-auto max-w-7xl px-4 pb-6 text-center text-sm text-slate-400">© 2026 TPT Team • Version 1.0</footer>

      {selected && <StockDetail stock={selected} onClose={() => setSelected(null)} />}
      {historyModal && <DividendHistoryModal data={historyModal} onClose={() => setHistoryModal(null)} />}
      {confirm && (
        <ConfirmModal
          title={confirm.title}
          message={confirm.message}
          variant={confirm.danger ? "danger" : "default"}
          busy={busy}
          onCancel={() => setConfirm(null)}
          onConfirm={runConfirm}
        />
      )}
    </main>
  );
}

function Sidebar({
  view,
  collapsed,
  onToggle,
  onSelect
}: {
  view: (typeof nav)[number]["key"];
  collapsed: boolean;
  onToggle: () => void;
  onSelect: (key: (typeof nav)[number]["key"]) => void;
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
        {nav.map((item) => {
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

function Metric({ label, value, icon: Icon, accent = "cyan" }: { label: string; value: string; icon: typeof LineChart; accent?: "cyan" | "gold" | "green" }) {
  const color = accent === "gold" ? "text-gold bg-gold/15" : accent === "green" ? "text-emerald-200 bg-emerald-400/15" : "text-cyan-200 bg-cyan-400/15";
  return (
    <div className="glass rounded-3xl p-5">
      <div className={`mb-5 inline-flex rounded-2xl p-3 ${color}`}>
        <Icon />
      </div>
      <div className="text-3xl font-extrabold">{value}</div>
      <div className="mt-1 text-slate-400">{label}</div>
    </div>
  );
}

function Dashboard({ data, buy, wait, expensive }: { data: Bootstrap; buy: Stock[]; wait: Stock[]; expensive: Stock[] }) {
  return (
    <div className="space-y-6">
      <div className="glass rounded-3xl p-6">
        <p className="text-gold">Dividend Copilot วันนี้</p>
        <h2 className="mt-2 text-3xl font-extrabold">หุ้นน่าสนใจวันนี้: {buy.slice(0, 3).map((x) => x.symbol).join(", ") || "ยังไม่มีสัญญาณซื้อชัดเจน"}</h2>
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

function RadarBucket({ title, rows }: { title: string; rows: Stock[] }) {
  return (
    <div className="glass rounded-3xl p-5">
      <h3 className="mb-4 text-xl font-extrabold">{title}</h3>
      <div className="space-y-3">
        {rows.slice(0, 5).map((stock) => (
          <div key={stock.id} className="flex items-center justify-between rounded-2xl bg-white/5 p-3">
            <div>
              <div className="font-bold">{stock.symbol}</div>
              <div className="text-sm text-slate-400">{stock.sector}</div>
            </div>
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

function Watchlist(props: {
  rows: Stock[];
  query: string;
  sector: string;
  status: string;
  sectors: string[];
  onQuery: (v: string) => void;
  onSector: (v: string) => void;
  onStatus: (v: string) => void;
  onSelect: (stock: Stock) => void;
}) {
  const [sortKey, setSortKey] = useState<WatchlistSortKey>("score");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const changeSort = (key: WatchlistSortKey) => {
    if (sortKey === key) {
      setSortDirection((value) => (value === "asc" ? "desc" : "asc"));
    } else {
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
      {label}
      <span className={sortKey === column ? "text-gold" : "text-slate-500"}>{sortIcon(sortKey === column, sortDirection)}</span>
    </button>
  );

  return (
    <div className="glass rounded-3xl p-5">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
        <h2 className="flex-1 text-3xl font-extrabold">Watchlist</h2>
        <div className="relative min-w-72">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input className="field pl-12" placeholder="Live Search..." value={props.query} onChange={(e) => props.onQuery(e.target.value)} />
        </div>
        <select className="field lg:w-56" value={props.sector} onChange={(e) => props.onSector(e.target.value)}>
          {props.sectors.map((x) => (
            <option key={x} value={x}>{x === "all" ? "All Sectors" : x}</option>
          ))}
        </select>
        <select className="field lg:w-56" value={props.status} onChange={(e) => props.onStatus(e.target.value)}>
          <option value="all">All Statuses</option>
          <option value="green">น่าสะสม</option>
          <option value="yellow">รอดู</option>
          <option value="red">แพง / ยังไม่เหมาะ</option>
        </select>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th><SortHeader column="symbol" label="หุ้น" /></th>
              <th><SortHeader column="price" label="ราคา" /></th>
              <th><SortHeader column="yield" label="Yield" /></th>
              <th><SortHeader column="score" label="Score" /></th>
              <th><SortHeader column="status" label="สถานะ" /></th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((stock) => {
              return (
                <tr key={stock.id}>
                  <td>
                    <div className="font-bold text-white">{stock.symbol}</div>
                    <div className="text-sm text-slate-400">{stock.name}</div>
                  </td>
                  <td>{money(stock.latestPrice?.price || 0, 2)}</td>
                  <td>{pct(stock.radar.yieldPct)}</td>
                  <td className="font-extrabold text-gold">{stock.radar.score}</td>
                  <td>
                    <StatusPill tone={stock.radar.tone} label={stock.radar.status} />
                  </td>
                  <td>
                    <button className="btn btn-blue !p-3" title="ดูรายละเอียด" onClick={() => props.onSelect(stock)}>
                      <Eye size={18} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StockDetail({ stock, onClose }: { stock: Stock; onClose: () => void }) {
  const dividend = displayDividend(stock);
  const dividendRows = [...stock.dividends]
    .filter((row) => row.xdDate || row.paymentDate || row.dividendAmount)
    .sort((a, b) => String(b.xdDate || "").localeCompare(String(a.xdDate || "")));
  return (
    <Modal title={`${stock.symbol} • ${stock.name}`} onClose={onClose}>
      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="ราคาล่าสุด" value={`${money(stock.latestPrice?.price || 0, 2)} ฿`} icon={LineChart} />
        <Metric label="Dividend Yield" value={pct(stock.radar.yieldPct)} icon={CircleDollarSign} accent="green" />
        <Metric label="Radar Score" value={`${stock.radar.score}/100`} icon={ShieldCheck} accent="gold" />
      </div>
      <div className="mt-6 rounded-3xl border border-sky-400/20 bg-white/5 p-5">
        <h3 className="mb-3 text-xl font-bold">เหตุผลที่ได้คะแนน</h3>
        <ul className="space-y-2 text-slate-200">
          {stock.radar.reasons.map((reason) => (
            <li key={reason} className="flex gap-2"><CheckCircle2 className="mt-1 text-gold" size={18} /> {reason}</li>
          ))}
        </ul>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Info label="ปันผลล่าสุด/ปี" value={`${money(stock.dividendPerShare || 0, 2)} ฿`} />
        <Info label="Payment Date" value={dateText(dividend?.paymentDate)} />
        <Info label="ราคาเป้าหมายสะสม" value={`${money(stock.targetBuyPrice || 0, 2)} ฿`} />
        <Info label="Fair Zone" value={`${money(stock.fairPriceLow || 0, 2)} - ${money(stock.fairPriceHigh || 0, 2)} ฿`} />
      </div>
      <div className="mt-6 rounded-3xl border border-sky-400/20 bg-white/5 p-5">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-xl font-extrabold text-white">ตารางปันผล</h3>
            <p className="text-sm text-slate-400">ข้อมูลเดียวกับ Dividend Calendar สำหรับหุ้น {stock.symbol}</p>
          </div>
          <span className="rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-sm font-bold text-gold">{dividendRows.length} รายการ</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>XD</th>
                <th>Payment</th>
                <th>Dividend</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
              {dividendRows.map((row) => (
                <tr key={row.id}>
                  <td>{dateText(row.xdDate)}</td>
                  <td>{dateText(row.paymentDate)}</td>
                  <td>{money(row.dividendAmount || 0, 4)} ฿</td>
                  <td>{row.dividendType || "-"}</td>
                </tr>
              ))}
              {dividendRows.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center text-slate-400">ยังไม่มีข้อมูลปันผล</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-sky-400/20 bg-night/70 p-4">
      <div className="text-sm text-slate-400">{label}</div>
      <div className="mt-1 font-bold text-white">{value}</div>
    </div>
  );
}

function Portfolio(props: {
  rows: PortfolioRow[];
  stocks: Stock[];
  form: { stockId: string; shares: string; avgCost: string; note: string };
  setForm: (v: { stockId: string; shares: string; avgCost: string; note: string }) => void;
  onAdd: () => void;
  onDelete: (row: PortfolioRow) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="glass rounded-3xl p-5">
        <h2 className="mb-5 text-3xl font-extrabold">Portfolio</h2>
        <div className="grid gap-3 md:grid-cols-5">
          <select className="field" value={props.form.stockId} onChange={(e) => props.setForm({ ...props.form, stockId: e.target.value })}>
            <option value="">เลือกหุ้น</option>
            {props.stocks.map((stock) => <option key={stock.id} value={stock.id}>{stock.symbol}</option>)}
          </select>
          <input className="field" placeholder="จำนวนหุ้น" type="number" value={props.form.shares} onChange={(e) => props.setForm({ ...props.form, shares: e.target.value })} />
          <input className="field" placeholder="ต้นทุนเฉลี่ย" type="number" value={props.form.avgCost} onChange={(e) => props.setForm({ ...props.form, avgCost: e.target.value })} />
          <input className="field" placeholder="Note" value={props.form.note} onChange={(e) => props.setForm({ ...props.form, note: e.target.value })} />
          <button className="btn btn-green" onClick={props.onAdd}><Plus size={18} /> เพิ่ม</button>
        </div>
      </div>
      <div className="glass rounded-3xl p-5">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>หุ้น</th><th>จำนวน</th><th>ต้นทุน</th><th>ราคาปัจจุบัน</th><th>กำไร/ขาดทุน</th><th>ปันผล/ปี</th><th>Yield on Cost</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {props.rows.map((row) => (
                <tr key={row.id}>
                  <td className="font-bold text-white">{row.stock.symbol}</td>
                  <td>{money(row.shares)}</td>
                  <td>{money(row.avgCost, 2)}</td>
                  <td>{money(row.currentPrice, 2)}</td>
                  <td className={row.gainLoss >= 0 ? "text-emerald-300" : "text-rose-300"}>{money(row.gainLoss)} ({pct(row.gainLossPct)})</td>
                  <td>{money(row.estimatedDividend)}</td>
                  <td>{pct(row.yieldOnCost)}</td>
                  <td><button className="btn btn-red !p-3" title="ลบ" onClick={() => props.onDelete(row)}><Trash2 size={18} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function DividendCalendar({
  stocks,
  lastSyncAt,
  onUpdateXd,
  onHistory,
  historyBusySymbol
}: {
  stocks: Stock[];
  lastSyncAt: string | null;
  onUpdateXd: () => void;
  onHistory: (stock: Stock) => void;
  historyBusySymbol: string | null;
}) {
  const rows = stocks
    .map((stock) => ({ stock, dividend: displayDividend(stock) }))
    .filter((row): row is { stock: Stock; dividend: NonNullable<ReturnType<typeof displayDividend>> } => Boolean(row.dividend))
    .sort((a, b) => String(a.dividend.xdDate).localeCompare(String(b.dividend.xdDate)));
  return (
    <div className="glass rounded-3xl p-5">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-3xl font-extrabold">Dividend Calendar</h2>
          <p className="mt-1 text-sm text-slate-400">
            Source: Settrade Stock Calendar • Last XD sync: <span className="font-bold text-gold">{dateTimeText(lastSyncAt)}</span>
          </p>
        </div>
        <button className="btn btn-blue" onClick={onUpdateXd}>
          <RefreshCw size={18} /> Update XD Calendar
        </button>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {rows.map(({ stock, dividend }) => (
          <div key={`${stock.id}-${dividend.id}`} className="rounded-3xl border border-sky-400/20 bg-white/5 p-5">
            <div className="flex items-center justify-between">
              <div className="text-2xl font-extrabold">
                {stock.symbol} <span className="text-lg font-bold text-slate-300">({money(stock.latestPrice?.price || 0, 2)} ฿)</span>
              </div>
              <StatusPill tone={stock.radar.tone} label={stock.radar.status} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Info label="XD" value={dateText(dividend.xdDate)} />
              <Info label="Payment" value={dateText(dividend.paymentDate)} />
              <Info label="Dividend" value={`${money(dividend.dividendAmount || 0, 4)} ฿`} />
              <Info label="Type" value={dividend.dividendType || "-"} />
            </div>
            <button className="btn btn-yellow mt-4 w-full" onClick={() => onHistory(stock)} disabled={historyBusySymbol === stock.symbol}>
              {historyBusySymbol === stock.symbol ? <Loader2 className="animate-spin" size={18} /> : <History size={18} />}
              ประวัติปันผล 4 ครั้งล่าสุด
            </button>
          </div>
        ))}
        {rows.length === 0 && <p className="text-slate-400">ยังไม่มีข้อมูล XD Calendar กด Update XD Calendar เพื่อดึงจาก Settrade</p>}
      </div>
      <XdHistoryMonthTable stocks={stocks} />
    </div>
  );
}

function DividendHistoryModal({ data, onClose }: { data: { stock: Pick<Stock, "symbol" | "name">; rows: DividendHistoryRow[] }; onClose: () => void }) {
  return (
    <Modal title={`Dividend History • ${data.stock.symbol}`} onClose={onClose}>
      <div className="mb-5 rounded-3xl border border-gold/30 bg-gold/10 p-5">
        <div className="text-2xl font-extrabold text-gold">{data.stock.symbol}</div>
        <p className="mt-1 text-slate-200">{data.stock.name}</p>
        <p className="mt-2 text-sm text-slate-400">แสดงประวัติ XD จาก Settrade Stock Calendar 4 ครั้งล่าสุดที่บันทึกใน SQLite</p>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ครั้งที่</th>
              <th>วันขึ้น XD</th>
              <th>วันจ่าย</th>
              <th>ปันผล/หุ้น</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, index) => (
              <tr key={row.id}>
                <td className="font-bold text-gold">{index + 1}</td>
                <td>{dateText(row.xdDate)}</td>
                <td>{dateText(row.paymentDate)}</td>
                <td>{money(row.dividendAmount || 0, 4)} ฿</td>
                <td>{row.dividendType || "-"}</td>
              </tr>
            ))}
            {data.rows.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-slate-400">ไม่พบประวัติปันผลจาก Settrade สำหรับหุ้นนี้</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}

function DcaPlan({ data }: { data: Bootstrap }) {
  return (
    <div className="glass rounded-3xl p-5">
      <h2 className="text-3xl font-extrabold">DCA Plan</h2>
      <p className="mt-2 text-slate-300">งบ DCA รายเดือน: {money(data.summary.dcaAmount)} บาท</p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {data.dcaPlan.map((row) => (
          <div key={row.symbol} className="rounded-3xl border border-gold/30 bg-gold/10 p-5">
            <div className="text-3xl font-extrabold text-gold">{row.symbol}</div>
            <p className="mt-1 text-slate-300">{row.name}</p>
            <div className="mt-5 text-2xl font-bold">{money(row.amount)} บาท</div>
            <p className="text-sm text-slate-400">Score {row.score}/100</p>
          </div>
        ))}
        {data.dcaPlan.length === 0 && <p className="text-slate-400">ยังไม่มีหุ้น Score มากกว่า 80 แนะนำให้ถือเงินสดบางส่วน</p>}
      </div>
    </div>
  );
}

function Alerts(props: {
  alerts: AlertRow[];
  stocks: Stock[];
  form: { stockId: string; alertType: string; targetValue: string };
  setForm: (v: { stockId: string; alertType: string; targetValue: string }) => void;
  onAdd: () => void;
  onDelete: (row: AlertRow) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="glass rounded-3xl p-5">
        <h2 className="mb-5 text-3xl font-extrabold">Smart Alert</h2>
        <div className="grid gap-3 md:grid-cols-4">
          <select className="field" value={props.form.stockId} onChange={(e) => props.setForm({ ...props.form, stockId: e.target.value })}>
            <option value="">เลือกหุ้น</option>
            {props.stocks.map((stock) => <option key={stock.id} value={stock.id}>{stock.symbol}</option>)}
          </select>
          <select className="field" value={props.form.alertType} onChange={(e) => props.setForm({ ...props.form, alertType: e.target.value })}>
            <option>Daily Radar</option><option>Buy Alert</option><option>XD Alert</option><option>Dividend Payment Alert</option><option>Portfolio Summary</option>
          </select>
          <input className="field" placeholder="Target value" type="number" value={props.form.targetValue} onChange={(e) => props.setForm({ ...props.form, targetValue: e.target.value })} />
          <button className="btn btn-green" onClick={props.onAdd}><Plus size={18} /> เพิ่ม Alert</button>
        </div>
      </div>
      <div className="glass rounded-3xl p-5">
        <div className="grid gap-3">
          {props.alerts.map((alert) => (
            <div key={alert.id} className="flex flex-col justify-between gap-3 rounded-2xl bg-white/5 p-4 sm:flex-row sm:items-center">
              <div><b>{alert.stock.symbol}</b> • {alert.alertType} • {alert.targetValue || "-"}</div>
              <button className="btn btn-red !p-3" title="ลบ" onClick={() => props.onDelete(alert)}><Trash2 size={18} /></button>
            </div>
          ))}
          {props.alerts.length === 0 && <p className="text-slate-400">ยังไม่มี Alert</p>}
        </div>
      </div>
    </div>
  );
}

function SettingsView(props: {
  form: SettingsForm;
  setForm: (v: SettingsForm) => void;
  logs: Bootstrap["notificationLogs"];
  onSave: () => void;
  onTestLine: () => void;
}) {
  const [newTime, setNewTime] = useState("18:00");
  const selectedDays = props.form.price_cron_days.split(",").filter(Boolean);
  const selectedTimes = props.form.price_cron_times.split(",").map((time) => time.trim()).filter(Boolean).sort();
  const dayPreview = cronDays.filter((day) => selectedDays.includes(day.value)).map((day) => day.short).join(", ") || "No days";
  const cronPreview = selectedDays.length && selectedTimes.length
    ? selectedTimes.map((time) => {
        const [hour, minute] = time.split(":");
        return `${Number(minute)} ${Number(hour)} * * ${selectedDays.join(",")} curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://2startup.cloud/diviradar/api/cron/market-update >/dev/null`;
      }).join("\n")
    : "เลือกวันและเวลาอย่างน้อย 1 รายการ";

  const updateDays = (dayValue: string) => {
    const next = selectedDays.includes(dayValue)
      ? selectedDays.filter((value) => value !== dayValue)
      : [...selectedDays, dayValue];
    const sorted = cronDays.map((day) => day.value).filter((value) => next.includes(value));
    props.setForm({ ...props.form, price_cron_days: sorted.join(",") });
  };

  const addTime = () => {
    if (!newTime || selectedTimes.includes(newTime)) return;
    props.setForm({ ...props.form, price_cron_times: [...selectedTimes, newTime].sort().join(",") });
  };

  const removeTime = (time: string) => {
    props.setForm({ ...props.form, price_cron_times: selectedTimes.filter((value) => value !== time).join(",") });
  };

  return (
    <div className="space-y-5">
      <div className="glass rounded-3xl p-5">
        <h2 className="mb-5 text-3xl font-extrabold">Settings</h2>
        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <ToggleRow
            icon={RefreshCw}
            title="Auto Price Update"
            description="เปิดให้ cron endpoint ดึงราคาจาก Yahoo Finance ตามรอบที่กำหนด"
            checked={props.form.auto_price_update_enabled === "true"}
            onChange={(checked) => props.setForm({ ...props.form, auto_price_update_enabled: checked ? "true" : "false" })}
          />
          <ToggleRow
            icon={Bell}
            title="LINE OA Notification"
            description="ส่ง Daily Radar / price update summary ผ่าน LINE OA เมื่อ cron ทำงาน"
            checked={props.form.line_notify_enabled === "true"}
            onChange={(checked) => props.setForm({ ...props.form, line_notify_enabled: checked ? "true" : "false" })}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block"><span className="mb-2 block text-slate-300">DCA รายเดือน</span><input className="field" value={props.form.monthly_dca_amount} onChange={(e) => props.setForm({ ...props.form, monthly_dca_amount: e.target.value })} /></label>
          <label className="block"><span className="mb-2 block text-slate-300">Schedule tolerance (minutes)</span><input className="field" type="number" min="0" max="30" value={props.form.cron_time_tolerance_minutes} onChange={(e) => props.setForm({ ...props.form, cron_time_tolerance_minutes: e.target.value })} /></label>
          <div className="md:col-span-2 rounded-3xl border border-sky-400/20 bg-white/5 p-5">
            <div className="mb-4 flex items-center gap-2 font-extrabold text-white"><Clock3 className="text-gold" /> Price Update Schedule</div>
            <div className="mb-4">
              <p className="mb-2 text-sm text-slate-400">เลือกวันที่ให้ระบบดึงราคาอัตโนมัติ</p>
              <div className="flex flex-wrap gap-2">
                {cronDays.map((day) => {
                  const active = selectedDays.includes(day.value);
                  return (
                    <button
                      key={day.value}
                      type="button"
                      className={`rounded-2xl border px-4 py-2 font-bold transition ${active ? "border-gold bg-gold text-night" : "border-sky-400/20 bg-night/70 text-slate-300"}`}
                      onClick={() => updateDays(day.value)}
                      title={day.label}
                    >
                      {day.short}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm text-slate-400">เพิ่มรอบเวลา</p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input className="field sm:max-w-48" type="time" value={newTime} onChange={(event) => setNewTime(event.target.value)} />
                <button type="button" className="btn btn-blue" onClick={addTime}><Plus size={18} /> Add Time</button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedTimes.map((time) => (
                  <button key={time} type="button" className="rounded-2xl border border-gold/50 bg-gold/10 px-4 py-2 font-bold text-gold" onClick={() => removeTime(time)} title="Click to remove">
                    {time} ×
                  </button>
                ))}
                {selectedTimes.length === 0 && <span className="text-sm text-slate-500">ยังไม่มีเวลา</span>}
              </div>
            </div>
            <div className="mt-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4">
              <p className="font-bold text-cyan-100">Schedule summary</p>
              <p className="mt-1 text-sm text-slate-300">Days: {dayPreview}</p>
              <p className="text-sm text-slate-300">Times: {selectedTimes.join(", ") || "No times"}</p>
            </div>
          </div>
          <label className="block"><span className="mb-2 block text-slate-300">LINE Target ID</span><input className="field" value={props.form.line_target_id} onChange={(e) => props.setForm({ ...props.form, line_target_id: e.target.value })} /></label>
          <label className="block md:col-span-2"><span className="mb-2 block text-slate-300">LINE Channel Token</span><input className="field" value={props.form.line_channel_token} onChange={(e) => props.setForm({ ...props.form, line_channel_token: e.target.value })} /></label>
          <label className="block md:col-span-2"><span className="mb-2 block text-slate-300">User.lineUserId</span><input className="field" value={props.form.lineUserId} onChange={(e) => props.setForm({ ...props.form, lineUserId: e.target.value })} /></label>
        </div>
        <div className="mt-4 rounded-2xl border border-sky-400/20 bg-cyan-400/10 p-4 text-sm text-cyan-50">
          <div className="mb-2 flex items-center gap-2 font-bold text-gold"><SlidersHorizontal size={18} /> วิธีใช้งาน cron</div>
          <p>ตั้งวันและเวลาใน app ได้จากส่วนด้านบน ส่วน server cron แนะนำให้เรียก endpoint ทุก 5 นาที แล้วให้ app เป็นตัวตรวจวัน/เวลาและ switch เปิด/ปิด</p>
          <pre className="mt-3 max-h-48 overflow-auto rounded-2xl bg-night/80 p-3 text-xs text-cyan-100">{cronPreview}</pre>
        </div>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button className="btn btn-green" onClick={props.onSave}><Save size={18} /> บันทึก Settings</button>
          <button className="btn btn-blue" onClick={props.onTestLine}><Bell size={18} /> ทดสอบ LINE</button>
        </div>
      </div>
      <div className="glass rounded-3xl p-5">
        <h3 className="mb-4 text-xl font-bold">Notification Logs</h3>
        <div className="grid gap-3">
          {props.logs.map((log) => (
            <div key={log.id} className="rounded-2xl bg-white/5 p-4">
              <div className="flex flex-wrap justify-between gap-3">
                <b>{log.title}</b>
                <span className="text-gold">{log.status}</span>
              </div>
              <p className="mt-1 text-sm text-slate-400">{log.message}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ToggleRow({
  icon: Icon,
  title,
  description,
  checked,
  onChange
}: {
  icon: typeof RefreshCw;
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className={`rounded-3xl border p-4 transition ${checked ? "border-gold/60 bg-gold/10" : "border-sky-400/20 bg-white/5"}`}>
      <div className="flex items-center gap-4">
        <div className={`rounded-2xl p-3 ${checked ? "bg-gold text-night" : "bg-slate-700 text-slate-200"}`}>
          <Icon size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-extrabold text-white">{title}</div>
          <p className="mt-1 text-sm text-slate-400">{description}</p>
        </div>
        <button
          type="button"
          aria-pressed={checked}
          className={`relative h-9 w-16 shrink-0 rounded-full p-1 transition ${checked ? "bg-gold" : "bg-slate-600"}`}
          onClick={() => onChange(!checked)}
        >
          <span className={`block h-7 w-7 rounded-full bg-white shadow transition ${checked ? "translate-x-7" : "translate-x-0"}`} />
        </button>
      </div>
    </div>
  );
}
