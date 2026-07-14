import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { withAuth } from "@/lib/api";
import { EDITABLE_SETTING_KEYS, publicSettings } from "@/lib/settings";

export async function GET() {
  return withAuth(async () => {
    await requireUser();
    const settings = await prisma.setting.findMany({ orderBy: { key: "asc" } });
    return Response.json(publicSettings(settings));
  });
}

export async function PUT(req: Request) {
  return withAuth(async () => {
    const user = await requireUser();
    const body = await req.json();
    const updates = (Object.entries(body.settings || {}) as [string, unknown][]).filter(
      ([key]) => EDITABLE_SETTING_KEYS.has(key)
    );
    for (const [key, value] of updates) {
      const normalizedValue = String(value ?? "").trim();
      if (key === "line_channel_token" && !normalizedValue) continue;
      await prisma.setting.upsert({
        where: { key },
        update: { value: normalizedValue },
        create: { key, value: normalizedValue }
      });
    }
    if (body.lineUserId !== undefined) {
      await prisma.user.update({ where: { id: user.id }, data: { lineUserId: String(body.lineUserId || "") } });
    }
    return Response.json({ ok: true });
  });
}
