import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { withAuth } from "@/lib/api";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async () => {
    const user = await requireUser();
    const { id } = await params;
    const body = await req.json();
    const row = await prisma.portfolio.update({
      where: { id: Number(id), userId: user.id },
      data: {
        stockId: Number(body.stockId),
        shares: Number(body.shares),
        avgCost: Number(body.avgCost),
        note: body.note || null
      }
    });
    return Response.json(row);
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async () => {
    const user = await requireUser();
    const { id } = await params;
    await prisma.portfolio.delete({ where: { id: Number(id), userId: user.id } });
    return Response.json({ ok: true });
  });
}
