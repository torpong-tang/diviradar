"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Eye,
  EyeOff,
  LineChart,
  Loader2,
  LogOut,
  PieChart,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  WalletCards
} from "lucide-react";
import { ConfirmModal, Modal, Spinner } from "@/components/ui";

type RadarTone = "green" | "yellow" | "red";

type Stock = {
  id: number;
  symbol: string;
  name: string;
  sector: string;
  yahooSymbol: string;
  dividendPerShare: number | null;
  targetBuyPrice: number | null;
  fairPriceLow: number | null;
  fairPriceHigh: number | null;
  stabilityScore: number;
  latestPrice: { price: number; change?: number; changePercent?: number; volume?: number; priceDate: string } | null;
  dividends: { id: number; xdDate: string | null; paymentDate: string | null; dividendAmount: number; dividendYear: number }[];
  radar: { score: number; status: string; tone: RadarTone; yieldPct: number; reasons: string[] };
};

type PortfolioRow = {
  id: number;
  stockId: number;
  shares: number;
  avgCost: number;
  note?: string | null;
  stock: { symbol: string; name: string; dividendPerShare: number | null };
  currentPrice: number;
  currentValue: number;
  costValue: number;
  gainLoss: number;
  gainLossPct: number;
  estimatedDividend: number;
  monthlyDividend: number;
  yieldOnCost: number;
};

type AlertRow = {
  id: number;
  stockId: number;
  alertType: string;
  targetValue?: number | null;
  isActive: boolean;
  stock: { symbol: string };
};

type Bootstrap = {
  user: { id: number; email: string; name?: string | null; lineUserId?: string | null };
  radar: Stock[];
  portfolioRows: PortfolioRow[];
  alerts: AlertRow[];
  settings: { key: string; value: string }[];
  notificationLogs: { id: number; title: string; message: string; channel: string; status: string; sentAt: string }[];
  summary: {
    watchlistCount: number;
    buyZoneCount: number;
    portfolioValue: number;
    annualDividend: number;
    monthlyDividend: number;
    dcaAmount: number;
  };
  dcaPlan: { symbol: string; name: string; score: number; amount: number }[];
};

const nav = [
  { key: "dashboard", label: "Dashboard", icon: LineChart },
  { key: "watchlist", label: "Watchlist", icon: ShieldCheck },
  { key: "portfolio", label: "Portfolio", icon: WalletCards },
  { key: "calendar", label: "Dividend Calendar", icon: CalendarDays },
  { key: "dca", label: "DCA Plan", icon: CircleDollarSign },
  { key: "alerts", label: "Alerts", icon: Bell },
  { key: "settings", label: "Settings", icon: Settings }
] as const;

function money(value: number, fraction = 0) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: fraction, minimumFractionDigits: fraction }).format(value || 0);
}

function pct(value: number) {
  return `${(value || 0).toFixed(1)}%`;
}

function dateText(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("th-TH", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function toneClass(tone: RadarTone) {
  return tone === "green" ? "status-green" : tone === "yellow" ? "status-yellow" : "status-red";
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) }
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "Request failed");
  }
  return response.json();
}

export function DiviRadarApp() {
  const [data, setData] = useState<Bootstrap | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<(typeof nav)[number]["key"]>("dashboard");
  const [login, setLogin] = useState({ email: "torpong.t@gmail.com", password: "Pound1234" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("all");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<Stock | null>(null);
  const [portfolioForm, setPortfolioForm] = useState({ stockId: "", shares: "", avgCost: "", note: "" });
  const [alertForm, setAlertForm] = useState({ stockId: "", alertType: "Buy Alert", targetValue: "" });
  const [settingsForm, setSettingsForm] = useState({ monthly_dca_amount: "20000", line_channel_token: "", line_target_id: "", lineUserId: "" });
  const [confirm, setConfirm] = useState<{ title: string; message: string; action: () => Promise<void>; danger?: boolean } | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      const payload = await api<Bootstrap>("/api/bootstrap");
      setData(payload);
      setSettingsForm({
        monthly_dca_amount: payload.settings.find((x) => x.key === "monthly_dca_amount")?.value || "20000",
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
      <main className="flex min-h-screen items-center justify-center p-6">
        <form onSubmit={doLogin} className="glass w-full max-w-md rounded-3xl p-8 shadow-glow">
          <div className="mb-8">
            <div className="mb-4 inline-flex rounded-2xl bg-gold/15 p-3 text-gold">
              <PieChart size={34} />
            </div>
            <h1 className="text-3xl font-extrabold">DiviRadar</h1>
            <p className="mt-2 text-slate-300">Dividend Copilot สำหรับพอร์ตหุ้นปันผลไทย</p>
          </div>
          {error && <div className="mb-4 rounded-2xl border border-rose-400/30 bg-rose-500/12 p-3 text-rose-100">{error}</div>}
          <label className="mb-2 block font-semibold text-slate-200">Email</label>
          <input className="field mb-4" value={login.email} onChange={(e) => setLogin({ ...login, email: e.target.value })} />
          <label className="mb-2 block font-semibold text-slate-200">Password</label>
          <div className="relative mb-6">
            <input
              className="field pr-12"
              type={showPassword ? "text" : "password"}
              value={login.password}
              onChange={(e) => setLogin({ ...login, password: e.target.value })}
            />
            <button
              type="button"
              aria-label="Toggle password"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-300"
              onClick={() => setShowPassword((x) => !x)}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          <button className="btn btn-yellow w-full" disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
            Login
          </button>
          <p className="mt-4 text-sm text-slate-400">Default: torpong.t@gmail.com / Pound1234</p>
        </form>
      </main>
    );
  }

  const buy = data.radar.filter((x) => x.radar.score >= 80).sort((a, b) => b.radar.score - a.radar.score);
  const wait = data.radar.filter((x) => x.radar.score >= 60 && x.radar.score < 80);
  const expensive = data.radar.filter((x) => x.radar.score < 60);

  return (
    <main className="min-h-screen pb-10">
      <header className="sticky top-0 z-30 border-b border-sky-400/20 bg-night/88 px-4 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center">
          <div className="flex flex-1 items-center gap-3">
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
                  message: "ดึงราคาล่าสุดจาก Yahoo Finance สำหรับหุ้นใน Watchlist ทั้งหมด?",
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
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[260px_1fr]">
        <aside className="glass h-fit rounded-3xl p-3">
          <div className="mb-3 rounded-2xl bg-white/5 p-4">
            <p className="text-sm text-slate-400">Signed in</p>
            <p className="truncate font-bold">{data.user.email}</p>
          </div>
          <nav className="grid gap-2">
            {nav.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  onClick={() => setView(item.key)}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left font-bold transition ${
                    view === item.key ? "bg-gold text-night shadow-gold" : "text-slate-200 hover:bg-white/8"
                  }`}
                >
                  <Icon size={20} /> {item.label}
                </button>
              );
            })}
          </nav>
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
          {view === "calendar" && <DividendCalendar stocks={data.radar} />}
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
                      body: JSON.stringify({ title: "DiviRadar Test", message: "ทดสอบแจ้งเตือนหุ้นปันผลจาก DiviRadar" })
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
        <p className="mt-3 max-w-3xl text-slate-300">คัดจาก Dividend Yield, Fair Zone, 52W High/Low, Stability, XD และ Dividend Growth แบบ rule-based ก่อนต่อยอด AI ในอนาคต</p>
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
              <div className="font-bold text-gold">{stock.radar.score}</div>
              <div className="text-sm text-slate-400">{pct(stock.radar.yieldPct)}</div>
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
              <th>หุ้น</th>
              <th>ราคา</th>
              <th>Yield</th>
              <th>XD</th>
              <th>Score</th>
              <th>สถานะ</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {props.rows.map((stock) => (
              <tr key={stock.id}>
                <td>
                  <div className="font-bold text-white">{stock.symbol}</div>
                  <div className="text-sm text-slate-400">{stock.name}</div>
                </td>
                <td>{money(stock.latestPrice?.price || 0, 2)}</td>
                <td>{pct(stock.radar.yieldPct)}</td>
                <td>{dateText(stock.dividends?.[0]?.xdDate)}</td>
                <td className="font-extrabold text-gold">{stock.radar.score}</td>
                <td>
                  <span className={`inline-flex rounded-full border px-3 py-1 text-sm font-bold ${toneClass(stock.radar.tone)}`}>{stock.radar.status}</span>
                </td>
                <td>
                  <button className="btn btn-blue !p-3" title="ดูรายละเอียด" onClick={() => props.onSelect(stock)}>
                    <Eye size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StockDetail({ stock, onClose }: { stock: Stock; onClose: () => void }) {
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
        <Info label="Payment Date" value={dateText(stock.dividends?.[0]?.paymentDate)} />
        <Info label="ราคาเป้าหมายสะสม" value={`${money(stock.targetBuyPrice || 0, 2)} ฿`} />
        <Info label="Fair Zone" value={`${money(stock.fairPriceLow || 0, 2)} - ${money(stock.fairPriceHigh || 0, 2)} ฿`} />
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

function DividendCalendar({ stocks }: { stocks: Stock[] }) {
  const rows = stocks.flatMap((stock) => stock.dividends.map((dividend) => ({ stock, dividend }))).sort((a, b) => String(a.dividend.xdDate).localeCompare(String(b.dividend.xdDate)));
  return (
    <div className="glass rounded-3xl p-5">
      <h2 className="mb-5 text-3xl font-extrabold">Dividend Calendar</h2>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {rows.map(({ stock, dividend }) => (
          <div key={`${stock.id}-${dividend.id}`} className="rounded-3xl border border-sky-400/20 bg-white/5 p-5">
            <div className="flex items-center justify-between">
              <div className="text-2xl font-extrabold">{stock.symbol}</div>
              <span className={`rounded-full border px-3 py-1 text-sm font-bold ${toneClass(stock.radar.tone)}`}>{stock.radar.status}</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Info label="XD" value={dateText(dividend.xdDate)} />
              <Info label="Payment" value={dateText(dividend.paymentDate)} />
            </div>
          </div>
        ))}
      </div>
    </div>
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
  form: { monthly_dca_amount: string; line_channel_token: string; line_target_id: string; lineUserId: string };
  setForm: (v: { monthly_dca_amount: string; line_channel_token: string; line_target_id: string; lineUserId: string }) => void;
  logs: Bootstrap["notificationLogs"];
  onSave: () => void;
  onTestLine: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="glass rounded-3xl p-5">
        <h2 className="mb-5 text-3xl font-extrabold">Settings</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block"><span className="mb-2 block text-slate-300">DCA รายเดือน</span><input className="field" value={props.form.monthly_dca_amount} onChange={(e) => props.setForm({ ...props.form, monthly_dca_amount: e.target.value })} /></label>
          <label className="block"><span className="mb-2 block text-slate-300">LINE Target ID</span><input className="field" value={props.form.line_target_id} onChange={(e) => props.setForm({ ...props.form, line_target_id: e.target.value })} /></label>
          <label className="block md:col-span-2"><span className="mb-2 block text-slate-300">LINE Channel Token</span><input className="field" value={props.form.line_channel_token} onChange={(e) => props.setForm({ ...props.form, line_channel_token: e.target.value })} /></label>
          <label className="block md:col-span-2"><span className="mb-2 block text-slate-300">User.lineUserId</span><input className="field" value={props.form.lineUserId} onChange={(e) => props.setForm({ ...props.form, lineUserId: e.target.value })} /></label>
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
