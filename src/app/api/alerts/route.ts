import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { withAuth, jsonError } from "@/lib/api";

export async function GET() {
  return withAuth(async () => {
    const user = await requireUser();
    const alerts = await prisma.alert.findMany({
      where: { userId: user.id },
      include: { stock: true },
      orderBy: { updatedAt: "desc" }
    });
    return Response.json(alerts);
  });
}

export async function POST(req: Request) {
  return withAuth(async () => {
    const user = await requireUser();
    const body = await req.json();
    if (!body.stockId || !body.alertType) return jsonError("Stock and alert type are required");
    const alert = await prisma.alert.create({
      data: {
        userId: user.id,
        stockId: Number(body.stockId),
        alertType: body.alertType,
        targetValue: body.targetValue ? Number(body.targetValue) : null,
        isActive: Boolean(body.isActive ?? true)
      }
    });
    return Response.json(alert, { status: 201 });
  });
}
