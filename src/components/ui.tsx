"use client";

import { AlertTriangle, CheckCircle2, Loader2, X } from "lucide-react";

export function Spinner({ label = "กำลังประมวลผล..." }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-6 text-cyan-100">
      <Loader2 className="h-6 w-6 animate-spin text-gold" />
      <span>{label}</span>
    </div>
  );
}

export function Modal({
  title,
  children,
  onClose
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="glass max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-sky-400/20 bg-[#10213a]/95 px-6 py-4">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button aria-label="Close" className="rounded-xl p-2 text-slate-300 hover:bg-white/10" onClick={onClose}>
            <X />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmModal({
  title,
  message,
  variant = "default",
  busy,
  onCancel,
  onConfirm
}: {
  title: string;
  message: string;
  variant?: "default" | "danger";
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal title={title} onClose={onCancel}>
      <div className="flex gap-4">
        <div className={`mt-1 rounded-2xl p-3 ${variant === "danger" ? "bg-rose-500/15 text-rose-200" : "bg-amber-400/15 text-gold"}`}>
          {variant === "danger" ? <AlertTriangle /> : <CheckCircle2 />}
        </div>
        <div className="flex-1">
          <p className="text-slate-200">{message}</p>
          <div className="mt-6 flex flex-col justify-end gap-3 sm:flex-row">
            <button className="btn btn-gray" onClick={onCancel} disabled={busy}>
              <X size={18} /> ยกเลิก
            </button>
            <button className={`btn ${variant === "danger" ? "btn-red" : "btn-green"}`} onClick={onConfirm} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
              ยืนยัน
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
