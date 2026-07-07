import { requireUser } from "@/lib/auth";
import { withAuth } from "@/lib/api";
import { getLatestPrice } from "@/lib/market-data/market-data-service";

export async function GET(req: Request) {
  return withAuth(async () => {
    await requireUser();
    const symbol = new URL(req.url).searchParams.get("symbol") || "";
    const price = await getLatestPrice(symbol);
    return Response.json({ symbol, price });
  });
}
