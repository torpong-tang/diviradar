"use client";

import { useState } from "react";
import { Calculator, CircleDollarSign, Layers3, RotateCcw, WalletCards } from "lucide-react";
import { money } from "@/components/diviradar/formatters";

type LotCalculation = {
  price: number;
  investment: number;
  lots: number;
  shares: number;
  totalCost: number;
  remaining: number;
};

export function CalculatorView() {
  const [price, setPrice] = useState("");
  const [investment, setInvestment] = useState("");
  const [result, setResult] = useState<LotCalculation | null>(null);
  const [error, setError] = useState("");

  const calculate = (event: React.FormEvent) => {
    event.preventDefault();

    const parsedPrice = Number(price);
    const parsedInvestment = Number(investment);
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setError("กรุณากรอกราคาหุ้นให้มากกว่า 0 บาท");
      setResult(null);
      return;
    }
    if (!Number.isFinite(parsedInvestment) || parsedInvestment <= 0) {
      setError("กรุณากรอกจำนวนเงินลงทุนให้มากกว่า 0 บาท");
      setResult(null);
      return;
    }

    const lotPrice = parsedPrice * 100;
    const lots = Math.floor((parsedInvestment + 1e-8) / lotPrice);
    const shares = lots * 100;
    const totalCost = shares * parsedPrice;

    setResult({
      price: parsedPrice,
      investment: parsedInvestment,
      lots,
      shares,
      totalCost,
      remaining: Math.max(0, parsedInvestment - totalCost)
    });
    setError("");
  };

  const reset = () => {
    setPrice("");
    setInvestment("");
    setResult(null);
    setError("");
  };

  return (
    <div className="space-y-5">
      <section className="glass rounded-3xl p-5 sm:p-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-4 inline-flex rounded-2xl bg-gold/15 p-3 text-gold">
              <Calculator aria-hidden="true" />
            </div>
            <h2 className="text-3xl font-extrabold">Calculator</h2>
            <p className="mt-2 max-w-2xl text-slate-300">
              คำนวณจำนวนหุ้นที่ซื้อได้แบบ Board Lot ละ 100 หุ้น โดยไม่ให้ยอดซื้อเกินเงินลงทุน
            </p>
          </div>
          <div className="rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-3 text-sm font-bold text-cyan-100">
            1 lot = 100 หุ้น
          </div>
        </div>

        <form className="mt-7 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end" onSubmit={calculate}>
          <label className="block">
            <span className="mb-2 block font-bold text-slate-200">ราคาหุ้นต่อหุ้น (บาท)</span>
            <input
              className="field"
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              placeholder="เช่น 12.50"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              required
            />
          </label>
          <label className="block">
            <span className="mb-2 block font-bold text-slate-200">จำนวนเงินที่ลงทุน (บาท)</span>
            <input
              className="field"
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              placeholder="เช่น 50,000"
              value={investment}
              onChange={(event) => setInvestment(event.target.value)}
              required
            />
          </label>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
            <button className="btn btn-yellow" type="submit">
              <Calculator size={18} aria-hidden="true" /> คำนวณ
            </button>
            <button className="btn btn-gray" type="button" onClick={reset}>
              <RotateCcw size={18} aria-hidden="true" /> ล้างค่า
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-5 rounded-2xl border border-rose-400/40 bg-rose-500/10 p-4 font-bold text-rose-200" role="alert">
            {error}
          </div>
        )}
      </section>

      {result && (
        <section className="glass rounded-3xl p-5 sm:p-7" aria-live="polite">
          <div className="flex flex-col gap-2 border-b border-sky-300/15 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-bold text-gold">ผลการคำนวณ</p>
              <div className="mt-1 text-4xl font-extrabold text-white">{money(result.shares)} หุ้น</div>
            </div>
            <p className="text-sm text-slate-400">
              ราคา {money(result.price, 2)} บาท/หุ้น จากเงินลงทุน {money(result.investment, 2)} บาท
            </p>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <ResultCard icon={Layers3} label="จำนวน Lot" value={`${money(result.lots)} lot`} accent="cyan" />
            <ResultCard icon={WalletCards} label="จำนวนหุ้นที่ซื้อได้" value={`${money(result.shares)} หุ้น`} accent="gold" />
            <ResultCard icon={CircleDollarSign} label="เงินที่ใช้ซื้อ" value={`${money(result.totalCost, 2)} บาท`} accent="green" />
            <ResultCard icon={CircleDollarSign} label="เงินคงเหลือ" value={`${money(result.remaining, 2)} บาท`} accent="slate" />
          </div>

          {result.lots === 0 ? (
            <div className="mt-5 rounded-2xl border border-amber-300/30 bg-amber-400/10 p-4 text-amber-100">
              เงินลงทุนยังไม่พอซื้อ 1 lot ซึ่งมีมูลค่า {money(result.price * 100, 2)} บาท
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-emerald-300/25 bg-emerald-400/10 p-4 text-emerald-100">
              จำนวนหุ้นถูกปัดลงเป็นหลักร้อยแล้ว จึงไม่ทำให้ยอดซื้อเกินเงินลงทุน
            </div>
          )}

          <p className="mt-4 text-sm text-slate-400">
            หมายเหตุ: ผลลัพธ์นี้ยังไม่รวมค่าคอมมิชชัน ค่าธรรมเนียม และภาษีที่เกี่ยวข้อง
          </p>
        </section>
      )}
    </div>
  );
}

function ResultCard({
  icon: Icon,
  label,
  value,
  accent
}: {
  icon: typeof Calculator;
  label: string;
  value: string;
  accent: "cyan" | "gold" | "green" | "slate";
}) {
  const color = {
    cyan: "bg-cyan-400/15 text-cyan-200",
    gold: "bg-gold/15 text-gold",
    green: "bg-emerald-400/15 text-emerald-200",
    slate: "bg-slate-400/15 text-slate-200"
  }[accent];

  return (
    <div className="rounded-2xl border border-sky-400/20 bg-night/70 p-4">
      <div className={`mb-4 inline-flex rounded-xl p-2.5 ${color}`}>
        <Icon size={20} aria-hidden="true" />
      </div>
      <div className="text-sm text-slate-400">{label}</div>
      <div className="mt-1 text-xl font-extrabold text-white">{value}</div>
    </div>
  );
}
