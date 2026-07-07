import { requireUser } from "@/lib/auth";
import { withAuth } from "@/lib/api";
import { updateAllStockPrices, updateStockPrice } from "@/lib/market-data/market-data-service";

export async function POST(req: Request) {
  return withAuth(async () => {
    await requireUser();
    const body = await req.json().catch(() => ({}));
    const result = body.symbol ? await updateStockPrice(body.symbol) : await updateAllStockPrices();
    return Response.json({ ok: true, result });
  });
}
