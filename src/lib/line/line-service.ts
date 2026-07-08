import { prisma } from "@/lib/prisma";

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

type RadarFlexStock = {
  symbol: string;
  price: number;
  score: number;
  yieldPct: number;
  status: string;
  tone: "green" | "yellow" | "red" | string;
};

function toneStyle(tone: string) {
  if (tone === "green") {
    return { icon: "🟢", color: "#22C55E", bg: "#DCFCE7", label: "น่าสะสม" };
  }
  if (tone === "yellow") {
    return { icon: "🟡", color: "#D97706", bg: "#FEF3C7", label: "รอดู" };
  }
  return { icon: "🔴", color: "#E11D48", bg: "#FFE4E6", label: "แพง / ยังไม่เหมาะ" };
}

function money(value: number) {
  return new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value || 0);
}

function bangkokDateTime() {
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date());
}

function stockRow(stock: RadarFlexStock, index: number) {
  const style = toneStyle(stock.tone);
  return {
    type: "box",
    layout: "vertical",
    spacing: "sm",
    paddingAll: "12px",
    margin: index === 0 ? "none" : "md",
    backgroundColor: "#F8FAFC",
    cornerRadius: "16px",
    contents: [
      {
        type: "box",
        layout: "horizontal",
        alignItems: "center",
        contents: [
          {
            type: "text",
            text: `${index + 1}`,
            flex: 0,
            size: "xs",
            weight: "bold",
            color: "#0F172A",
            align: "center",
            gravity: "center"
          },
          {
            type: "text",
            text: stock.symbol,
            flex: 1,
            margin: "md",
            size: "lg",
            weight: "bold",
            color: "#0F172A"
          },
          {
            type: "box",
            layout: "horizontal",
            flex: 0,
            alignItems: "center",
            paddingStart: "8px",
            paddingEnd: "8px",
            paddingTop: "4px",
            paddingBottom: "4px",
            backgroundColor: style.bg,
            cornerRadius: "999px",
            contents: [
              { type: "text", text: style.icon, flex: 0, size: "xs" },
              { type: "text", text: style.label, flex: 0, margin: "xs", size: "xs", weight: "bold", color: style.color }
            ]
          }
        ]
      },
      {
        type: "box",
        layout: "horizontal",
        margin: "sm",
        contents: [
          { type: "text", text: `ราคา ${money(stock.price)} ฿`, size: "sm", weight: "bold", color: "#1E293B" },
          { type: "text", text: `Score ${stock.score}`, size: "sm", weight: "bold", color: "#2563EB", align: "end" }
        ]
      },
      {
        type: "box",
        layout: "horizontal",
        margin: "xs",
        contents: [
          { type: "text", text: `Yield ${stock.yieldPct.toFixed(1)}%`, size: "sm", color: "#64748B" },
          { type: "text", text: "Dividend Radar", size: "xs", color: "#94A3B8", align: "end" }
        ]
      }
    ]
  };
}

export async function pushDailyRadarFlexMessage(updatedCount: number, stocks: RadarFlexStock[]) {
  const title = "DiviRadar Daily Radar";
  const message = `Updated ${updatedCount} stocks. Top: ${stocks.map((stock) => stock.symbol).join(", ")}`;
  const config = await getLineConfig({}, title, message);
  if (config.skipped) return config.result;

  const payload = {
    to: config.target,
    messages: [
      {
        type: "flex",
        altText: `DiviRadar Daily Radar: อัปเดตราคา ${updatedCount} รายการ`,
        contents: {
          type: "bubble",
          size: "mega",
          body: {
            type: "box",
            layout: "vertical",
            paddingAll: "0px",
            backgroundColor: "#0B1220",
            contents: [
              {
                type: "box",
                layout: "vertical",
                paddingAll: "20px",
                backgroundColor: "#0EA5E9",
                contents: [
                  { type: "text", text: "📈 DiviRadar", weight: "bold", color: "#FFFFFF", size: "xl" },
                  { type: "text", text: "Daily Dividend Radar", color: "#E0F2FE", size: "sm", margin: "xs" }
                ]
              },
              {
                type: "box",
                layout: "vertical",
                paddingAll: "18px",
                spacing: "md",
                contents: [
                  {
                    type: "box",
                    layout: "horizontal",
                    contents: [
                      { type: "text", text: "อัปเดตราคา", color: "#CBD5E1", size: "sm" },
                      { type: "text", text: `${updatedCount} รายการ`, color: "#FACC15", size: "sm", weight: "bold", align: "end" }
                    ]
                  },
                  {
                    type: "box",
                    layout: "horizontal",
                    contents: [
                      { type: "text", text: "เวลา", color: "#CBD5E1", size: "sm" },
                      { type: "text", text: bangkokDateTime(), color: "#FFFFFF", size: "sm", weight: "bold", align: "end" }
                    ]
                  },
                  { type: "separator", margin: "md", color: "#1E3A5F" },
                  { type: "text", text: "หุ้นเด่นวันนี้", color: "#FFFFFF", size: "lg", weight: "bold", margin: "sm" },
                  ...stocks.slice(0, 5).map(stockRow),
                  {
                    type: "box",
                    layout: "vertical",
                    margin: "lg",
                    paddingAll: "12px",
                    backgroundColor: "#111827",
                    cornerRadius: "14px",
                    contents: [
                      { type: "text", text: "🟢 น่าสะสม  🟡 รอดู  🔴 แพง/ยังไม่เหมาะ", size: "xs", color: "#E5E7EB", wrap: true },
                      { type: "text", text: "กดเข้า DiviRadar เพื่อดูรายละเอียดและ Dividend Calendar", size: "xs", color: "#94A3B8", margin: "xs", wrap: true }
                    ]
                  }
                ]
              }
            ]
          }
        }
      }
    ]
  };

  return sendLinePayload(title, message, payload, { force: true });
}
