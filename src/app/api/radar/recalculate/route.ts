import { requireUser } from "@/lib/auth";
import { withAuth } from "@/lib/api";
import { updateAllStockPrices } from "@/lib/market-data/market-data-service";

export async function POST() {
  return withAuth(async () => {
    await requireUser();
    const updated = await updateAllStockPrices();
    return Response.json({ ok: true, updated: updated.length });
  });
}
