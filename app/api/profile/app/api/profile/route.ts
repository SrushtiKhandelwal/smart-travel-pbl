import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { err } from "@/lib/http";
import { currentTraveler } from "@/lib/session";

export async function GET() {
  const t = await currentTraveler();
  if (!t) return err("Login required", 401);
  return NextResponse.json({ id: t.id, name: t.name, email: t.email, phone: t.phone });
}
export async function PUT(req: Request) {
  const t = await currentTraveler();
  if (!t) return err("Login required", 401);
  const b = await req.json().catch(() => ({}));
  if (b.name !== undefined && (typeof b.name !== "string" || b.name.trim() === "")) return err("Name cannot be empty");
  if (b.phone !== undefined && b.phone !== null && !/^\d{10}$/.test(String(b.phone))) return err("Phone must be 10 digits");
  const u = await prisma.traveler.update({
    where: { id: t.id },
    data: { name: b.name?.trim() ?? t.name, phone: b.phone === undefined ? t.phone : b.phone },
  });
  return NextResponse.json({ id: u.id, name: u.name, email: u.email, phone: u.phone });
}
