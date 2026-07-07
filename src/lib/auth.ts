import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "diviradar_session";
const encoder = new TextEncoder();

function getSecret() {
  const secret = process.env.JWT_SECRET || "dev-secret-change-before-production-min-32-chars";
  return encoder.encode(secret);
}

export async function createSession(userId: number) {
  const token = await new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(getSecret());

  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function getSessionUser() {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const verified = await jwtVerify(token, getSecret());
    const userId = Number(verified.payload.userId);
    if (!userId) return null;
    return prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, lineUserId: true }
    });
  } catch {
    return null;
  }
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export async function verifyPassword(password: string, hash?: string | null) {
  if (!hash) return false;
  return bcrypt.compare(password, hash);
}
