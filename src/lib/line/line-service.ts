import { prisma } from "@/lib/prisma";
import { buildDailyRadarFlexPayload, type RadarFlexStock } from "@/lib/line/daily-radar-flex";

type LineOptions = { force?: boolean };

async function getLineConfig(options: LineOptions, title: string, message: string) {
  const notifyEnabled = (await prisma.setting.findUnique({ where: { key: "line_notify_enabled" } }))?.value ?? "false";
  if (!options.force && notifyEnabled !== "true") {
    await prisma.notificationLog.create({
      data: { title, message, channel: "LINE", status: "SKIPPED_DISABLED" }
    });
    return { skipped: true as const, result: { ok: false, status: "SKIPPED_DISABLED" } };
  }

  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN || (await prisma.setting.findUnique({ where: { key: "line_channel_token" } }))?.value;
  const target = process.env.LINE_TARGET_ID || (await prisma.setting.findUnique({ where: { key: "line_target_id" } }))?.value;

  if (!token || !target) {
    await prisma.notificationLog.create({
      data: { title, message, channel: "LINE", status: "SKIPPED_NO_CONFIG" }
    });
    return { skipped: true as const, result: { ok: false, status: "SKIPPED_NO_CONFIG" } };
  }

  return { skipped: false as const, token, target };
}

async function sendLinePayload(title: string, message: string, payload: unknown, options: LineOptions = {}) {
  const config = await getLineConfig(options, title, message);
  if (config.skipped) return config.result;

  const response = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  await prisma.notificationLog.create({
    data: { title, message, channel: "LINE", status: response.ok ? "SENT" : `FAILED_${response.status}` }
  });

  return { ok: response.ok, status: response.status };
}

export async function pushLineMessage(title: string, message: string, options: LineOptions = {}) {
  const config = await getLineConfig(options, title, message);
  if (config.skipped) return config.result;
  return sendLinePayload(
    title,
    message,
    {
      to: config.target,
      messages: [{ type: "text", text: `${title}\n\n${message}` }]
    },
    { ...options, force: true }
  );
}

export async function pushDailyRadarFlexMessage(updatedCount: number, stocks: RadarFlexStock[]) {
  const title = "DiviRadar Daily Radar";
  const message = `Updated ${updatedCount} stocks. Top: ${stocks.map((stock) => stock.symbol).join(", ")}`;
  const config = await getLineConfig({}, title, message);
  if (config.skipped) return config.result;

  const payload = buildDailyRadarFlexPayload(config.target, updatedCount, stocks);
  return sendLinePayload(title, message, payload, { force: true });
}
