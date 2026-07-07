import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { withAuth, jsonError } from "@/lib/api";

export async function GET() {
  return withAuth(async () => {
    const user = await requireUser();
    const rows = await prisma.portfolio.findMany({
      where: { userId: user.id },
      include: { stock: { include: { prices: { orderBy: { priceDate: "desc" }, take: 1 } } } },
      orderBy: { updatedAt: "desc" }
    });
    return Response.json(rows);
  });
}

export async function POST(req: Request) {
  return withAuth(async () => {
    const user = await requireUser();
    const body = await req.json();
    if (!body.stockId || !body.shares || !body.avgCost) return jsonError("Stock, shares, and average cost are required");
    const row = await prisma.portfolio.create({
      data: {
        userId: user.id,
        stockId: Number(body.stockId),
        shares: Number(body.shares),
        avgCost: Number(body.avgCost),
        note: body.note || null
      }
    });
    return Response.json(row, { status: 201 });
  });
}
