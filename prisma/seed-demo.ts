import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const stocks = [
  { symbol: "KTB", name: "Krung Thai Bank", sector: "Banking", yahooSymbol: "KTB.BK", price: 39.75, dps: 2.65, fairLow: 34, fairHigh: 42, target: 36, low52: 31.25, high52: 43.5, stability: 82, growth: 4 },
  { symbol: "PTT", name: "PTT Public Company", sector: "Energy", yahooSymbol: "PTT.BK", price: 33.25, dps: 2.1, fairLow: 30, fairHigh: 36, target: 31, low52: 28.5, high52: 38, stability: 86, growth: 2 },
  { symbol: "HMPRO", name: "Home Product Center", sector: "Retail", yahooSymbol: "HMPRO.BK", price: 6.02, dps: 0.38, fairLow: 5.6, fairHigh: 7, target: 5.8, low52: 5.2, high52: 9.1, stability: 84, growth: 6 },
  { symbol: "LH", name: "Land and Houses", sector: "Property", yahooSymbol: "LH.BK", price: 3.78, dps: 0.26, fairLow: 3.55, fairHigh: 4.4, target: 3.7, low52: 3.32, high52: 7.2, stability: 80, growth: 3 },
  { symbol: "TISCO", name: "TISCO Financial Group", sector: "Banking", yahooSymbol: "TISCO.BK", price: 102, dps: 7.75, fairLow: 86, fairHigh: 100, target: 90, low52: 84.5, high52: 104, stability: 92, growth: 2 },
  { symbol: "EGCO", name: "Electricity Generating", sector: "Power", yahooSymbol: "EGCO.BK", price: 116, dps: 6.5, fairLow: 110, fairHigh: 135, target: 112, low52: 100, high52: 158, stability: 88, growth: 1 },
  { symbol: "RATCH", name: "RATCH Group", sector: "Power", yahooSymbol: "RATCH.BK", price: 30.5, dps: 1.6, fairLow: 28, fairHigh: 34, target: 29, low52: 25.5, high52: 44, stability: 84, growth: 0 },
  { symbol: "AMATA", name: "Amata Corporation", sector: "Industrial Estate", yahooSymbol: "AMATA.BK", price: 24.7, dps: 0.85, fairLow: 21, fairHigh: 27, target: 22, low52: 18.4, high52: 28.75, stability: 72, growth: 5 },
  { symbol: "BBL", name: "Bangkok Bank", sector: "Banking", yahooSymbol: "BBL.BK", price: 158, dps: 7, fairLow: 145, fairHigh: 170, target: 148, low52: 128, high52: 174, stability: 90, growth: 4 },
  { symbol: "ADVANC", name: "Advanced Info Service", sector: "ICT", yahooSymbol: "ADVANC.BK", price: 222, dps: 8.6, fairLow: 200, fairHigh: 240, target: 205, low52: 183, high52: 238, stability: 94, growth: 5 },
  { symbol: "SCB", name: "SCB X", sector: "Banking", yahooSymbol: "SCB.BK", price: 114, dps: 8.4, fairLow: 101, fairHigh: 122, target: 105, low52: 92, high52: 124, stability: 84, growth: 3 },
  { symbol: "TTB", name: "TMBThanachart Bank", sector: "Banking", yahooSymbol: "TTB.BK", price: 1.92, dps: 0.11, fairLow: 1.7, fairHigh: 2.1, target: 1.78, low52: 1.48, high52: 2.16, stability: 78, growth: 6 },
  { symbol: "CPF", name: "Charoen Pokphand Foods", sector: "Food", yahooSymbol: "CPF.BK", price: 22.5, dps: 0.65, fairLow: 20, fairHigh: 27, target: 21, low52: 18.2, high52: 26.75, stability: 76, growth: 2 },
  { symbol: "CPALL", name: "CP All", sector: "Commerce", yahooSymbol: "CPALL.BK", price: 50.75, dps: 1.25, fairLow: 48, fairHigh: 62, target: 49, low52: 43.5, high52: 68, stability: 84, growth: 4 },
  { symbol: "MINT", name: "Minor International", sector: "Tourism", yahooSymbol: "MINT.BK", price: 25.25, dps: 0.35, fairLow: 24, fairHigh: 34, target: 24.5, low52: 21.9, high52: 36, stability: 70, growth: 5 },
  { symbol: "AOT", name: "Airports of Thailand", sector: "Transportation", yahooSymbol: "AOT.BK", price: 39.25, dps: 0.79, fairLow: 36, fairHigh: 48, target: 38, low52: 31.5, high52: 64, stability: 82, growth: 3 }
];

async function main() {
  if (!process.argv.includes("--confirm-demo-reset")) {
    throw new Error("Demo seed is destructive. Run it only through npm run db:seed:demo.");
  }
  const email = process.env.DEMO_ADMIN_EMAIL?.trim();
  const password = process.env.DEMO_ADMIN_PASSWORD;
  if (!email || !password || password.length < 12) {
    throw new Error("Set DEMO_ADMIN_EMAIL and DEMO_ADMIN_PASSWORD (minimum 12 characters) before demo seed.");
  }

  await prisma.notificationLog.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.portfolio.deleteMany();
  await prisma.dividend.deleteMany();
  await prisma.stockPrice.deleteMany();

  const user = await prisma.user.upsert({
    where: { email },
    update: { password: await bcrypt.hash(password, 12), name: "Demo Admin" },
    create: { email, name: "Demo Admin", password: await bcrypt.hash(password, 12) }
  });

  for (const setting of [
    { key: "monthly_dca_amount", value: "20000" },
    { key: "line_channel_token", value: "" },
    { key: "line_target_id", value: "" },
    { key: "auto_price_update_enabled", value: "false" },
    { key: "price_cron_days", value: "1,2,3,4,5" },
    { key: "price_cron_times", value: "10:30,12:30,16:45,18:00" },
    { key: "cron_time_tolerance_minutes", value: "3" },
    { key: "line_notify_enabled", value: "false" }
  ]) {
    await prisma.setting.upsert({ where: { key: setting.key }, update: { value: setting.value }, create: setting });
  }

  for (const item of stocks) {
    const stock = await prisma.stock.upsert({
      where: { symbol: item.symbol },
      update: { name: item.name, sector: item.sector, yahooSymbol: item.yahooSymbol, dividendPerShare: item.dps, fairPriceLow: item.fairLow, fairPriceHigh: item.fairHigh, targetBuyPrice: item.target, weekLow52: item.low52, weekHigh52: item.high52, stabilityScore: item.stability, dividendGrowth: item.growth },
      create: { symbol: item.symbol, name: item.name, sector: item.sector, yahooSymbol: item.yahooSymbol, dividendPerShare: item.dps, fairPriceLow: item.fairLow, fairPriceHigh: item.fairHigh, targetBuyPrice: item.target, weekLow52: item.low52, weekHigh52: item.high52, stabilityScore: item.stability, dividendGrowth: item.growth }
    });
    await prisma.stockPrice.create({ data: { stockId: stock.id, price: item.price, change: Number(((Math.random() - 0.45) * 1.4).toFixed(2)), changePercent: Number(((Math.random() - 0.45) * 2.5).toFixed(2)), volume: Math.round(800000 + Math.random() * 12000000), priceDate: new Date(), source: "Seed fallback" } });
    await prisma.dividend.create({ data: { stockId: stock.id, xdDate: new Date(Date.now() + (14 + Math.floor(Math.random() * 70)) * 86400000), paymentDate: new Date(Date.now() + (45 + Math.floor(Math.random() * 80)) * 86400000), dividendAmount: item.dps, dividendYear: new Date().getFullYear(), dividendType: "Annual estimate" } });
  }

  for (const holding of [
    { symbol: "LH", shares: 10000, avgCost: 3.9 },
    { symbol: "HMPRO", shares: 5000, avgCost: 6.3 },
    { symbol: "PTT", shares: 1200, avgCost: 32.5 }
  ]) {
    const stock = await prisma.stock.findUnique({ where: { symbol: holding.symbol } });
    if (stock) await prisma.portfolio.create({ data: { userId: user.id, stockId: stock.id, shares: holding.shares, avgCost: holding.avgCost, note: "Seed portfolio" } });
  }
  console.log("Demo data reset completed. Credentials were not printed.");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
