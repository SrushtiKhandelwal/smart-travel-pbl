import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { err } from "@/lib/http";
import { COOKIE, makeToken } from "@/lib/session";

const MAX_FAILS = 5; // SRS: repeated invalid logins are limited. Threshold 5 is an assumption.
const LOCK_MINUTES = 15;

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  if (!b.email || !b.password) return err("Email and password are required");
  const t = await prisma.traveler.findUnique({ where: { email: String(b.email).trim().toLowerCase() } });
  if (!t) return err("Invalid email or password", 401);
  if (t.lockedUntil && t.lockedUntil > new Date()) return err("Account temporarily locked. Try later", 429);
  if (!(await bcrypt.compare(String(b.password), t.passwordHash))) {
    const fails = t.failedLogins + 1;
    await prisma.traveler.update({
      where: { id: t.id },
      data: fails >= MAX_FAILS
        ? { failedLogins: 0, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60000) }
        : { failedLogins: fails },
    });
    return err("Invalid email or password", 401);
  }
  await prisma.traveler.update({ where: { id: t.id }, data: { failedLogins: 0, lockedUntil: null } });
  const res = NextResponse.json({ id: t.id, name: t.name });
  res.cookies.set(COOKIE, makeToken(t.id), { httpOnly: true, sameSite: "lax", path: "/" });
  return res;
}
