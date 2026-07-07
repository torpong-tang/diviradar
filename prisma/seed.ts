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
  { symbol: "TTB", name: "TMBThanachart Bank", sector: "Banking", yahooSymbol: "TTB.BK", price: 1.92, dps: 0.11, fairLow: 1.7, fairHigh: 2.1, target: 1.78, low52: 1.48, high52: 2.16, stability: 78, growth: 6 }
];

async function main() {
  await prisma.notificationLog.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.portfolio.deleteMany();
  await prisma.dividend.deleteMany();
  await prisma.stockPrice.deleteMany();

  const password = await bcrypt.hash("Pound1234", 12);
  const user = await prisma.user.upsert({
    where: { email: "torpong.t@gmail.com" },
    update: { password, name: "Torpong T." },
    create: { email: "torpong.t@gmail.com", name: "Torpong T.", password }
  });

  await prisma.setting.upsert({
    where: { key: "monthly_dca_amount" },
    update: { value: "20000" },
    create: { key: "monthly_dca_amount", value: "20000" }
  });

  await prisma.setting.upsert({
    where: { key: "line_channel_token" },
    update: { value: "" },
    create: { key: "line_channel_token", value: "" }
  });

  await prisma.setting.upsert({
    where: { key: "line_target_id" },
    update: { value: "" },
    create: { key: "line_target_id", value: "" }
  });

  for (const item of stocks) {
    const stock = await prisma.stock.upsert({
      where: { symbol: item.symbol },
      update: {
        name: item.name,
        sector: item.sector,
        yahooSymbol: item.yahooSymbol,
        dividendPerShare: item.dps,
        fairPriceLow: item.fairLow,
        fairPriceHigh: item.fairHigh,
        targetBuyPrice: item.target,
        weekLow52: item.low52,
        weekHigh52: item.high52,
        stabilityScore: item.stability,
        dividendGrowth: item.growth
      },
      create: {
        symbol: item.symbol,
        name: item.name,
        sector: item.sector,
        yahooSymbol: item.yahooSymbol,
        dividendPerShare: item.dps,
        fairPriceLow: item.fairLow,
        fairPriceHigh: item.fairHigh,
        targetBuyPrice: item.target,
        weekLow52: item.low52,
        weekHigh52: item.high52,
        stabilityScore: item.stability,
        dividendGrowth: item.growth
      }
    });

    await prisma.stockPrice.create({
      data: {
        stockId: stock.id,
        price: item.price,
        change: Number(((Math.random() - 0.45) * 1.4).toFixed(2)),
        changePercent: Number(((Math.random() - 0.45) * 2.5).toFixed(2)),
        volume: Math.round(800000 + Math.random() * 12000000),
        priceDate: new Date(),
        source: "Seed fallback"
      }
    });

    await prisma.dividend.create({
      data: {
        stockId: stock.id,
        xdDate: new Date(Date.now() + (14 + Math.floor(Math.random() * 70)) * 86400000),
        paymentDate: new Date(Date.now() + (45 + Math.floor(Math.random() * 80)) * 86400000),
        dividendAmount: item.dps,
        dividendYear: 2026,
        dividendType: "Annual estimate"
      }
    });
  }

  const lh = await prisma.stock.findUnique({ where: { symbol: "LH" } });
  const hmpro = await prisma.stock.findUnique({ where: { symbol: "HMPRO" } });
  const ptt = await prisma.stock.findUnique({ where: { symbol: "PTT" } });

  for (const holding of [
    { stock: lh, shares: 10000, avgCost: 3.9 },
    { stock: hmpro, shares: 5000, avgCost: 6.3 },
    { stock: ptt, shares: 1200, avgCost: 32.5 }
  ]) {
    if (!holding.stock) continue;
    await prisma.portfolio.create({
      data: {
        userId: user.id,
        stockId: holding.stock.id,
        shares: holding.shares,
        avgCost: holding.avgCost,
        note: "Seed portfolio"
      }
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
