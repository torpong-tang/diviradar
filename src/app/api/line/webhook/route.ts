import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { logNotification } from "@/lib/notification-log";

type LineWebhookEvent = {
  type?: string;
  replyToken?: string;
  message?: { type?: string; text?: string };
  source?: {
    type?: string;
    userId?: string;
    groupId?: string;
    roomId?: string;
  };
};

async function getLineChannelToken() {
  return process.env.LINE_CHANNEL_ACCESS_TOKEN || (await prisma.setting.findUnique({ where: { key: "line_channel_token" } }))?.value || "";
}

function verifyLineSignature(rawBody: string, signature: string, channelSecret: string) {
  const expected = createHmac("sha256", channelSecret).update(rawBody).digest();
  const received = Buffer.from(signature, "base64");
  return received.length === expected.length && timingSafeEqual(received, expected);
}

function sourceIdText(event: LineWebhookEvent) {
  const source = event.source;
  if (!source) return "ไม่พบ source id ใน webhook event นี้";

  if (source.type === "group" && source.groupId) {
    return `DiviRadar LINE Group ID\n\n${source.groupId}\n\nนำค่านี้ไปใส่ใน Settings > LINE Target ID`;
  }
  if (source.type === "room" && source.roomId) {
    return `DiviRadar LINE Room ID\n\n${source.roomId}\n\nนำค่านี้ไปใส่ใน Settings > LINE Target ID`;
  }
  if (source.type === "user" && source.userId) {
    return `DiviRadar LINE User ID\n\n${source.userId}\n\nนำค่านี้ไปใส่ใน Settings > LINE Target ID หากต้องการส่งหา user นี้`;
  }

  return "ไม่พบ groupId, roomId หรือ userId ใน webhook event นี้";
}

async function replyLineText(replyToken: string, text: string) {
  const token = await getLineChannelToken();
  if (!token) {
    await logNotification({
        title: "LINE Webhook /id",
        message: "Cannot reply /id because LINE channel token is not configured.",
        channel: "LINE",
        status: "SKIPPED_NO_TOKEN"
    });
    return { ok: false, status: "SKIPPED_NO_TOKEN" };
  }

  const response = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: "text", text }]
    })
  });

  await logNotification({
      title: "LINE Webhook /id",
      message: text.slice(0, 1000),
      channel: "LINE",
      status: response.ok ? "REPLIED" : `FAILED_${response.status}`
  });

  return { ok: response.ok, status: response.status };
}

export async function POST(req: Request) {
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  if (!channelSecret) {
    return Response.json({ error: "LINE webhook is not configured" }, { status: 503 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-line-signature") || "";
  if (!signature || !verifyLineSignature(rawBody, signature, channelSecret)) {
    return Response.json({ error: "Invalid LINE signature" }, { status: 401 });
  }

  let body: { events?: unknown };
  try {
    body = JSON.parse(rawBody || "{}");
  } catch {
    return Response.json({ error: "Invalid JSON payload" }, { status: 400 });
  }
  const events = Array.isArray(body.events) ? (body.events as LineWebhookEvent[]) : [];
  await logNotification({
      title: "LINE Webhook",
      message: `Received ${events.length} verified event(s): ${events.map((event) => event.type || "unknown").join(", ")}`,
      channel: "LINE",
      status: "VERIFIED"
  });

  for (const event of events) {
    const text = event.message?.type === "text" ? event.message.text?.trim() : "";
    if (event.type === "message" && event.replyToken && text === "/id") {
      await replyLineText(event.replyToken, sourceIdText(event));
    }
  }

  return Response.json({ ok: true });
}
