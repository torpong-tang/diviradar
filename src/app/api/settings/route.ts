import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { withAuth } from "@/lib/api";

export async function GET() {
  return withAuth(async () => {
    await requireUser();
    return Response.json(await prisma.setting.findMany({ orderBy: { key: "asc" } }));
  });
}

export async function PUT(req: Request) {
  return withAuth(async () => {
    const user = await requireUser();
    const body = await req.json();
    const updates = Object.entries(body.settings || {}) as [string, string][];
    for (const [key, value] of updates) {
      await prisma.setting.upsert({
        where: { key },
        update: { value: String(value ?? "") },
        create: { key, value: String(value ?? "") }
      });
    }
    if (body.lineUserId !== undefined) {
      await prisma.user.update({ where: { id: user.id }, data: { lineUserId: String(body.lineUserId || "") } });
    }
    return Response.json({ ok: true });
  });
}
