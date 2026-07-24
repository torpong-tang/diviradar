import { requireUser } from "@/lib/auth";
import { withAuth } from "@/lib/api";
import { fetchSettradeXdCalendar } from "@/lib/market-data/settrade-calendar-service";
import { prismaSettradeXdRepository } from "@/lib/market-data/settrade-xd-repository";
import {
  syncSettradeXdCalendar,
  type XdSyncRequest
} from "@/lib/market-data/settrade-xd-sync-service";

export async function POST(req: Request) {
  return withAuth(async () => {
    await requireUser();
    const body = (await req.json().catch(() => ({}))) as XdSyncRequest;
    const result = await syncSettradeXdCalendar(body, {
      repository: prismaSettradeXdRepository,
      fetchCalendar: fetchSettradeXdCalendar
    });

    const allTargetsFailed =
      result.successfulTargets === 0 && result.errors.length > 0;
    return Response.json(
      allTargetsFailed
        ? { ...result, error: "Unable to update XD data from Settrade" }
        : result,
      {
        status: allTargetsFailed ? 502 : result.ok ? 200 : 207
      }
    );
  });
}
