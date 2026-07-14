"use client";

import { useState } from "react";
import { Bell, Clock3, Plus, RefreshCw, Save, SlidersHorizontal } from "lucide-react";
import type { Bootstrap, SettingsForm } from "@/components/diviradar/types";

const cronDays = [
  { value: "1", short: "Mon", label: "จันทร์" },
  { value: "2", short: "Tue", label: "อังคาร" },
  { value: "3", short: "Wed", label: "พุธ" },
  { value: "4", short: "Thu", label: "พฤหัส" },
  { value: "5", short: "Fri", label: "ศุกร์" },
  { value: "6", short: "Sat", label: "เสาร์" },
  { value: "0", short: "Sun", label: "อาทิตย์" }
];

function ToggleRow({ icon: Icon, title, description, checked, onChange }: {
  icon: typeof RefreshCw;
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className={`rounded-3xl border p-4 transition ${checked ? "border-gold/60 bg-gold/10" : "border-sky-400/20 bg-white/5"}`}>
      <div className="flex items-center gap-4"><div className={`rounded-2xl p-3 ${checked ? "bg-gold text-night" : "bg-slate-700 text-slate-200"}`}><Icon size={22} /></div><div className="min-w-0 flex-1"><div className="font-extrabold text-white">{title}</div><p className="mt-1 text-sm text-slate-400">{description}</p></div><button type="button" aria-pressed={checked} className={`relative h-9 w-16 shrink-0 rounded-full p-1 transition ${checked ? "bg-gold" : "bg-slate-600"}`} onClick={() => onChange(!checked)}><span className={`block h-7 w-7 rounded-full bg-white shadow transition ${checked ? "translate-x-7" : "translate-x-0"}`} /></button></div>
    </div>
  );
}

export function SettingsView(props: {
  form: SettingsForm;
  setForm: (value: SettingsForm) => void;
  logs: Bootstrap["notificationLogs"];
  onSave: () => void;
  onTestLine: () => void;
}) {
  const [newTime, setNewTime] = useState("18:00");
  const selectedDays = props.form.price_cron_days.split(",").filter(Boolean);
  const selectedTimes = props.form.price_cron_times.split(",").map((time) => time.trim()).filter(Boolean).sort();
  const dayPreview = cronDays.filter((day) => selectedDays.includes(day.value)).map((day) => day.short).join(", ") || "No days";
  const cronPreview = selectedDays.length && selectedTimes.length
    ? selectedTimes.map((time) => { const [hour, minute] = time.split(":"); return `${Number(minute)} ${Number(hour)} * * ${selectedDays.join(",")} curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://2startup.cloud/diviradar/api/cron/market-update >/dev/null`; }).join("\n")
    : "เลือกวันและเวลาอย่างน้อย 1 รายการ";
  const updateDays = (dayValue: string) => { const next = selectedDays.includes(dayValue) ? selectedDays.filter((value) => value !== dayValue) : [...selectedDays, dayValue]; const sorted = cronDays.map((day) => day.value).filter((value) => next.includes(value)); props.setForm({ ...props.form, price_cron_days: sorted.join(",") }); };
  const addTime = () => { if (!newTime || selectedTimes.includes(newTime)) return; props.setForm({ ...props.form, price_cron_times: [...selectedTimes, newTime].sort().join(",") }); };
  const removeTime = (time: string) => props.setForm({ ...props.form, price_cron_times: selectedTimes.filter((value) => value !== time).join(",") });

  return (
    <div className="space-y-5">
      <div className="glass rounded-3xl p-5">
        <h2 className="mb-5 text-3xl font-extrabold">Settings</h2>
        <div className="mb-6 grid gap-4 md:grid-cols-2"><ToggleRow icon={RefreshCw} title="Auto Price Update" description="เปิดให้ cron endpoint ดึงราคาจาก Yahoo Finance ตามรอบที่กำหนด" checked={props.form.auto_price_update_enabled === "true"} onChange={(checked) => props.setForm({ ...props.form, auto_price_update_enabled: checked ? "true" : "false" })} /><ToggleRow icon={Bell} title="LINE OA Notification" description="ส่ง Daily Radar / price update summary ผ่าน LINE OA เมื่อ cron ทำงาน" checked={props.form.line_notify_enabled === "true"} onChange={(checked) => props.setForm({ ...props.form, line_notify_enabled: checked ? "true" : "false" })} /></div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block"><span className="mb-2 block text-slate-300">Schedule tolerance (minutes)</span><input className="field" type="number" min="0" max="30" value={props.form.cron_time_tolerance_minutes} onChange={(event) => props.setForm({ ...props.form, cron_time_tolerance_minutes: event.target.value })} /></label>
          <div className="md:col-span-2 rounded-3xl border border-sky-400/20 bg-white/5 p-5"><div className="mb-4 flex items-center gap-2 font-extrabold text-white"><Clock3 className="text-gold" /> Price Update Schedule</div><div className="mb-4"><p className="mb-2 text-sm text-slate-400">เลือกวันที่ให้ระบบดึงราคาอัตโนมัติ</p><div className="flex flex-wrap gap-2">{cronDays.map((day) => { const active = selectedDays.includes(day.value); return <button key={day.value} type="button" className={`rounded-2xl border px-4 py-2 font-bold transition ${active ? "border-gold bg-gold text-night" : "border-sky-400/20 bg-night/70 text-slate-300"}`} onClick={() => updateDays(day.value)} title={day.label}>{day.short}</button>; })}</div></div><div><p className="mb-2 text-sm text-slate-400">เพิ่มรอบเวลา</p><div className="flex flex-col gap-3 sm:flex-row"><input className="field sm:max-w-48" type="time" value={newTime} onChange={(event) => setNewTime(event.target.value)} /><button type="button" className="btn btn-blue" onClick={addTime}><Plus size={18} /> Add Time</button></div><div className="mt-3 flex flex-wrap gap-2">{selectedTimes.map((time) => <button key={time} type="button" className="rounded-2xl border border-gold/50 bg-gold/10 px-4 py-2 font-bold text-gold" onClick={() => removeTime(time)} title="Click to remove">{time} ×</button>)}{selectedTimes.length === 0 && <span className="text-sm text-slate-500">ยังไม่มีเวลา</span>}</div></div><div className="mt-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4"><p className="font-bold text-cyan-100">Schedule summary</p><p className="mt-1 text-sm text-slate-300">Days: {dayPreview}</p><p className="text-sm text-slate-300">Times: {selectedTimes.join(", ") || "No times"}</p></div></div>
          <label className="block"><span className="mb-2 block text-slate-300">LINE Target ID</span><input className="field" value={props.form.line_target_id} onChange={(event) => props.setForm({ ...props.form, line_target_id: event.target.value })} /></label>
          <label className="block md:col-span-2"><span className="mb-2 block text-slate-300">LINE Channel Token</span><input className="field" type="password" autoComplete="new-password" placeholder={props.form.line_channel_token_configured ? "Token configured • enter a new token only to replace it" : "Enter LINE Channel Access Token"} value={props.form.line_channel_token} onChange={(event) => props.setForm({ ...props.form, line_channel_token: event.target.value })} /><span className="mt-2 block text-xs text-slate-400">ระบบไม่ส่ง token เดิมกลับมายัง browser</span></label>
          <label className="block md:col-span-2"><span className="mb-2 block text-slate-300">User.lineUserId</span><input className="field" value={props.form.lineUserId} onChange={(event) => props.setForm({ ...props.form, lineUserId: event.target.value })} /></label>
        </div>
        <div className="mt-4 rounded-2xl border border-sky-400/20 bg-cyan-400/10 p-4 text-sm text-cyan-50"><div className="mb-2 flex items-center gap-2 font-bold text-gold"><SlidersHorizontal size={18} /> วิธีใช้งาน cron</div><p>ตั้งวันและเวลาใน app ได้จากส่วนด้านบน ส่วน server cron แนะนำให้เรียก endpoint ทุก 5 นาที แล้วให้ app เป็นตัวตรวจวัน/เวลาและ switch เปิด/ปิด</p><pre className="mt-3 max-h-48 overflow-auto rounded-2xl bg-night/80 p-3 text-xs text-cyan-100">{cronPreview}</pre></div>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row"><button className="btn btn-green" onClick={props.onSave}><Save size={18} /> บันทึก Settings</button><button className="btn btn-blue" onClick={props.onTestLine}><Bell size={18} /> ทดสอบ LINE</button></div>
      </div>
      <div className="glass rounded-3xl p-5"><h3 className="mb-4 text-xl font-bold">Notification Logs</h3><div className="grid gap-3">{props.logs.map((log) => <div key={log.id} className="rounded-2xl bg-white/5 p-4"><div className="flex flex-wrap justify-between gap-3"><b>{log.title}</b><span className="text-gold">{log.status}</span></div><p className="mt-1 text-sm text-slate-400">{log.message}</p></div>)}</div></div>
    </div>
  );
}
