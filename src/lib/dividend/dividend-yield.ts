export function dividendYield(dividendPerShare?: number | null, price?: number | null) {
  if (!dividendPerShare || !price || price <= 0) return 0;
  return (dividendPerShare / price) * 100;
}

export function annualDividend(shares: number, dividendPerShare?: number | null) {
  return shares * (dividendPerShare || 0);
}
