import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { err } from "@/lib/http";
import { validateEmail, validatePassword } from "@/lib/validation";

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  if (typeof b.name !== "string" || b.name.trim() === "") return err("Name is required");
  const e = validateEmail(b.email) ?? validatePassword(b.password);
  if (e) return err(e);
  const email = b.email.trim().toLowerCase();
  if (await prisma.traveler.findUnique({ where: { email } })) return err("Email already registered", 409);
  const t = await prisma.traveler.create({
    data: { name: b.name.trim(), email, passwordHash: await bcrypt.hash(b.password, 10) },
  });
  return NextResponse.json({ id: t.id, email: t.email }, { status: 201 });
}
