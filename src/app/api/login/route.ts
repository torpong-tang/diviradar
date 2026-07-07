import { createSession, verifyPassword } from "@/lib/auth";
import { jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { email, password } = await req.json();
  if (!email || !password) return jsonError("Email and password are required", 400);

  const user = await prisma.user.findUnique({ where: { email } });
  const valid = await verifyPassword(password, user?.password);
  if (!user || !valid) return jsonError("Invalid email or password", 401);

  await createSession(user.id);
  return Response.json({ user: { id: user.id, email: user.email, name: user.name, lineUserId: user.lineUserId } });
}
