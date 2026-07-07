import { requireUser } from "@/lib/auth";
import { withAuth } from "@/lib/api";
import { pushLineMessage } from "@/lib/line/line-service";

export async function POST(req: Request) {
  return withAuth(async () => {
    await requireUser();
    const body = await req.json().catch(() => ({}));
    const result = await pushLineMessage(body.title || "DiviRadar", body.message || "Test notification from DiviRadar", { force: Boolean(body.force) });
    return Response.json(result);
  });
}
