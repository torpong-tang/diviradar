import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { withAuth } from "@/lib/api";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async () => {
    const user = await requireUser();
    const { id } = await params;
    const body = await req.json();
    const alert = await prisma.alert.update({
      where: { id: Number(id), userId: user.id },
      data: {
        stockId: Number(body.stockId),
        alertType: body.alertType,
        targetValue: body.targetValue ? Number(body.targetValue) : null,
        isActive: Boolean(body.isActive ?? true)
      }
    });
    return Response.json(alert);
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async () => {
    const user = await requireUser();
    const { id } = await params;
    await prisma.alert.delete({ where: { id: Number(id), userId: user.id } });
    return Response.json({ ok: true });
  });
}
