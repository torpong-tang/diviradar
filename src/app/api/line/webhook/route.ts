import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  await prisma.notificationLog.create({
    data: {
      title: "LINE Webhook",
      message: JSON.stringify(body).slice(0, 1000),
      channel: "LINE",
      status: "RECEIVED"
    }
  });
  return Response.json({ ok: true });
}
