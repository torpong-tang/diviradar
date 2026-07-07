import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { withAuth } from "@/lib/api";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async () => {
    await requireUser();
    const { id } = await params;
    const stock = await prisma.stock.findUnique({
      where: { id: Number(id) },
      include: {
        prices: { orderBy: { priceDate: "desc" }, take: 120 },
        dividends: { orderBy: { xdDate: "desc" } }
      }
    });
    return Response.json(stock);
  });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async () => {
    await requireUser();
    const { id } = await params;
    const body = await req.json();
    const stock = await prisma.stock.update({
      where: { id: Number(id) },
      data: {
        name: body.name,
        sector: body.sector,
        dividendPerShare: Number(body.dividendPerShare || 0),
        targetBuyPrice: Number(body.targetBuyPrice || 0),
        fairPriceLow: Number(body.fairPriceLow || 0),
        fairPriceHigh: Number(body.fairPriceHigh || 0),
        stabilityScore: Number(body.stabilityScore || 80),
        isActive: Boolean(body.isActive ?? true)
      }
    });
    return Response.json(stock);
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async () => {
    await requireUser();
    const { id } = await params;
    await prisma.stock.delete({ where: { id: Number(id) } });
    return Response.json({ ok: true });
  });
}
