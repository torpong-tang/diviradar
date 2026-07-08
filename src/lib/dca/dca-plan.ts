export type DcaSourceStock = {
  symbol: string;
  name: string;
  score: number;
  price: number;
};

export type DcaPlanItem = DcaSourceStock & {
  amount: number;
  shares: number;
  actualAmount: number;
  variancePct: number;
  isWithinTolerance: boolean;
};

export function calculateLotPurchase(allocatedAmount: number, price: number) {
  if (!Number.isFinite(allocatedAmount) || allocatedAmount <= 0 || !Number.isFinite(price) || price <= 0) {
    return { shares: 0, actualAmount: 0, variancePct: 0, isWithinTolerance: false };
  }

  const rawLots = allocatedAmount / (price * 100);
  const candidates = Array.from(new Set([Math.floor(rawLots), Math.round(rawLots), Math.ceil(rawLots)]))
    .filter((lots) => lots > 0)
    .map((lots) => {
      const shares = lots * 100;
      const actualAmount = shares * price;
      const variancePct = ((actualAmount - allocatedAmount) / allocatedAmount) * 100;
      return { shares, actualAmount, variancePct, isWithinTolerance: Math.abs(variancePct) <= 5 };
    })
    .sort((a, b) => Math.abs(a.variancePct) - Math.abs(b.variancePct));

  return candidates[0] ?? { shares: 0, actualAmount: 0, variancePct: 0, isWithinTolerance: false };
}

export function buildDcaPlan(stocks: DcaSourceStock[], amount: number): DcaPlanItem[] {
  if (!Number.isFinite(amount) || amount <= 0) return [];

  const candidates = stocks
    .filter((stock) => stock.score >= 80)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  const weights = [0.4, 0.35, 0.25].slice(0, candidates.length);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0) || 1;

  return candidates.map((stock, index) => {
    const allocatedAmount = Math.round(((amount * weights[index]) / totalWeight) / 100) * 100;
    const lot = calculateLotPurchase(allocatedAmount, stock.price);
    return {
      ...stock,
      amount: allocatedAmount,
      ...lot
    };
  });
}
