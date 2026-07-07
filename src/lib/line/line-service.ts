import { prisma } from "@/lib/prisma";

export async function pushLineMessage(title: string, message: string) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN || (await prisma.setting.findUnique({ where: { key: "line_channel_token" } }))?.value;
  const target = process.env.LINE_TARGET_ID || (await prisma.setting.findUnique({ where: { key: "line_target_id" } }))?.value;

  if (!token || !target) {
    await prisma.notificationLog.create({
      data: { title, message, channel: "LINE", status: "SKIPPED_NO_CONFIG" }
    });
    return { ok: false, status: "SKIPPED_NO_CONFIG" };
  }

  const response = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      to: target,
      messages: [{ type: "text", text: `${title}\n\n${message}` }]
    })
  });

  await prisma.notificationLog.create({
    data: { title, message, channel: "LINE", status: response.ok ? "SENT" : `FAILED_${response.status}` }
  });

  return { ok: response.ok, status: response.status };
}
