import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { err } from "@/lib/http";
import { currentTraveler } from "@/lib/session";
import { totalAmount } from "@/lib/bookingState";
import { validatePassengers, validateTravelDate } from "@/lib/validation";

export async function GET() {
  const t = await currentTraveler();
  if (!t) return err("Login required", 401);
  return NextResponse.json(
    await prisma.booking.findMany({ where: { travelerId: t.id }, include: { service: true, payments: true }, orderBy: { id: "desc" } })
  );
}

// Create a booking. SRS: login required, availability validated, starts PENDING (not confirmed until paid).
export async function POST(req: Request) {
  const t = await currentTraveler();
  if (!t) return err("Login required", 401);
  const b = await req.json().catch(() => ({}));
  const e = validatePassengers(b.passengers) ?? validateTravelDate(b.travelDate);
  if (e) return err(e);
  const s = await prisma.travelService.findUnique({ where: { id: Number(b.serviceId) } });
  if (!s) return err("Service not found", 404);
  if (!s.available) return err("Selected service is unavailable", 409);
  const booking = await prisma.booking.create({
    data: {
      travelerId: t.id, serviceId: s.id, passengers: b.passengers,
      travelDate: new Date(b.travelDate + "T00:00:00Z"),
      totalAmount: totalAmount(s.price, b.passengers), status: "PENDING",
    },
  });
  return NextResponse.json(booking, { status: 201 });
}
