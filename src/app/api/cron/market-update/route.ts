import { prisma } from "@/lib/prisma";
import { updateAllStockPrices } from "@/lib/market-data/market-data-service";
import { calculateRadarScore } from "@/lib/radar/calculate-score";
import { pushDailyRadarFlexMessage } from "@/lib/line/line-service";
import { buildDcaPlan } from "@/lib/dca/dca-plan";

const dayMap: Record<string, string> = {
  Sun: "0",
  Mon: "1",
  Tue: "2",
  Wed: "3",
  Thu: "4",
  Fri: "5",
  Sat: "6"
};

function isAuthorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret && process.env.NODE_ENV !== "production") return true;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

function bangkokNowParts() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(new Date());
  const weekday = parts.find((part) => part.type === "weekday")?.value || "Mon";
  const hour = Number(parts.find((part) => part.type === "hour")?.value || "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value || "0");
  return { day: dayMap[weekday] || "1", minutes: hour * 60 + minute, time: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}` };
}

function shouldRunNow(settings: Record<string, string>, force: boolean) {
  if (force) return { ok: true };
  const days = (settings.price_cron_days || "1,2,3,4,5").split(",").map((value) => value.trim()).filter(Boolean);
  const times = (settings.price_cron_times || "10:30,12:30,16:45,18:00").split(",").map((value) => value.trim()).filter(Boolean);
  const tolerance = Number(settings.cron_time_tolerance_minutes || 3);
  const now = bangkokNowParts();
  if (!days.includes(now.day)) {
    return { ok: false, reason: `OUTSIDE_CONFIGURED_DAYS_${now.day}` };
  }
  const matchesTime = times.some((time) => {
    const [hour, minute] = time.split(":").map(Number);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return false;
    return Math.abs(now.minutes - (hour * 60 + minute)) <= tolerance;
  });
  if (!matchesTime) {
    return { ok: false, reason: `OUTSIDE_CONFIGURED_TIMES_${now.time}` };
  }
  return { ok: true };
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return Response.json({ error: "Unauthorized cron request" }, { status: 401 });
  }

  const settingRows = await prisma.setting.findMany();
  const settings = Object.fromEntries(settingRows.map((setting) => [setting.key, setting.value]));
  const autoEnabled = settings.auto_price_update_enabled ?? "false";
  if (autoEnabled !== "true") {
    await prisma.notificationLog.create({
      data: {
        title: "DiviRadar Cron",
        message: "Auto price update is disabled in Settings.",
        channel: "SYSTEM",
        status: "SKIPPED_DISABLED"
      }
    });
    return Response.json({ ok: true, skipped: true, reason: "AUTO_PRICE_UPDATE_DISABLED" });
  }

  const force = new URL(req.url).searchParams.get("force") === "1";
  const scheduleGate = shouldRunNow(settings, force);
  if (!scheduleGate.ok) {
    await prisma.notificationLog.create({
      data: {
        title: "DiviRadar Cron",
        message: `Skipped by app schedule. ${scheduleGate.reason}`,
        channel: "SYSTEM",
        status: "SKIPPED_SCHEDULE"
      }
    });
    return Response.json({ ok: true, skipped: true, reason: scheduleGate.reason });
  }

  const updated = await updateAllStockPrices();
  const stocks = await prisma.stock.findMany({
    where: { isActive: true },
    include: {
      prices: { orderBy: { priceDate: "desc" }, take: 1 },
      dividends: { orderBy: [{ xdDate: "asc" }], take: 3 }
    }
  });
  const radar = stocks
    .map((stock) => ({ stock, radar: calculateRadarScore(stock) }))
    .sort((a, b) => b.radar.score - a.radar.score);
  const lineNotifyEnabled = (await prisma.setting.findUnique({ where: { key: "line_notify_enabled" } }))?.value ?? "false";

  let lineResult: unknown = null;
  if (lineNotifyEnabled === "true") {
    const dcaAmount = Number(settings.monthly_dca_amount || 20000);
    const dcaPlan = buildDcaPlan(
      radar.map((row) => ({
        symbol: row.stock.symbol,
        name: row.stock.name,
        score: row.radar.score,
        price: row.stock.prices[0]?.price || 0
      })),
      dcaAmount
    );
    lineResult = await pushDailyRadarFlexMessage(
      updated.length,
      radar.slice(0, 5).map((row) => ({
        symbol: row.stock.symbol,
        price: row.stock.prices[0]?.price || 0,
        score: row.radar.score,
        yieldPct: row.radar.yieldPct,
        status: row.radar.status,
        tone: row.radar.tone
      })),
      dcaPlan
    );
  }

  await prisma.notificationLog.create({
    data: {
      title: "DiviRadar Cron",
      message: `Updated ${updated.length} stock prices. LINE=${lineNotifyEnabled}`,
      channel: "SYSTEM",
      status: "DONE"
    }
  });

  return Response.json({ ok: true, updated: updated.length, lineNotifyEnabled, lineResult });
}
