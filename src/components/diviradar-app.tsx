"use client";

import { useEffect, useMemo, useState } from "react";
import { LogOut, Menu, PieChart, RefreshCw } from "lucide-react";
import { ConfirmModal, Spinner } from "@/components/ui";
import { api } from "@/components/diviradar/client-api";
import { dateTimeText } from "@/components/diviradar/formatters";
import { LoginView } from "@/components/diviradar/login-view";
import { Sidebar, type AppView } from "@/components/diviradar/navigation";
import { Dashboard } from "@/components/diviradar/views/dashboard-view";
import { Watchlist } from "@/components/diviradar/views/watchlist-view";
import { Portfolio } from "@/components/diviradar/views/portfolio-view";
import { DividendCalendar, DividendHistoryModal } from "@/components/diviradar/views/dividend-calendar-view";
import { DcaPlan } from "@/components/diviradar/views/dca-plan-view";
import { Alerts } from "@/components/diviradar/views/alerts-view";
import { CalculatorView } from "@/components/diviradar/views/calculator-view";
import { SettingsView } from "@/components/diviradar/views/settings-view";
import { StockDetail } from "@/components/diviradar/views/stock-detail-modal";
import type { Bootstrap, DividendHistoryRow, SettingsForm, Stock } from "@/components/diviradar/types";

export function DiviRadarApp() {
  const [data, setData] = useState<Bootstrap | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<AppView>("dashboard");
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
    line_channel_token_configured: false,
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
        line_channel_token: "",
        line_channel_token_configured: payload.settings.find((x) => x.key === "line_channel_token_configured")?.value === "true",
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

      <div className={`mx-auto grid max-w-7xl gap-6 px-4 py-6 ${sidebarCollapsed ? "lg:grid-cols-[88px_minmax(0,1fr)]" : "lg:grid-cols-[260px_minmax(0,1fr)]"}`}>
        <aside className="hidden lg:block">
          <Sidebar
            view={view}
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed((value) => !value)}
            onSelect={setView}
          />
        </aside>

        <section className="min-w-0 space-y-6">
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
                    const result = await api<{
                      ok: boolean;
                      errors: string[];
                      warnings: string[];
                    }>("/api/dividends/settrade/update", {
                      method: "POST",
                      body: JSON.stringify({ fullYear: true })
                    });
                    if (!result.ok) {
                      const details = [...result.errors, ...result.warnings]
                        .slice(0, 2)
                        .join(" | ");
                      throw new Error(
                        details
                          ? `XD Calendar updated partially: ${details}`
                          : "XD Calendar updated partially. Please try again."
                      );
                    }
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
          {view === "calculator" && <CalculatorView />}
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
                          line_target_id: settingsForm.line_target_id,
                          ...(settingsForm.line_channel_token.trim()
                            ? { line_channel_token: settingsForm.line_channel_token.trim() }
                            : {})
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
