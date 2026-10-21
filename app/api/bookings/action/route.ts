import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { err } from "@/lib/http";
import { currentTraveler } from "@/lib/session";
import { BookingEvent, BookingStatus, nextStatus } from "@/lib/bookingState";
import { simulatePayment } from "@/lib/payment";

// POST { bookingId, action: "pay" | "cancel" | "complete", cardToken? }
// "complete" simulates the trip-completion event (no real trip in the demo).
export async function POST(req: Request) {
  const t = await currentTraveler();
  if (!t) return err("Login required", 401);
  const b = await req.json().catch(() => ({}));
  const booking = await prisma.booking.findUnique({ where: { id: Number(b.bookingId) }, include: { service: true } });
  if (!booking || booking.travelerId !== t.id) return err("Booking not found", 404);
  const status = booking.status as BookingStatus;

  if (b.action === "pay") {
    if (status !== "PENDING") return err(`Cannot pay a ${status} booking`, 409);
    if (!booking.service.available) return err("Selected service is unavailable. No payment taken", 409); // SRS: alert before payment
    const result = simulatePayment(b.cardToken, booking.totalAmount);
    await prisma.payment.create({ data: { bookingId: booking.id, amount: booking.totalAmount, status: result } });
    if (result === "FAILED")
      return NextResponse.json({ error: "Payment failed. Booking not confirmed. You can retry or cancel", status }, { status: 402 });
    const next = nextStatus(status, "PAY_SUCCESS")!;
    const u = await prisma.booking.update({ where: { id: booking.id }, data: { status: next } });
    return NextResponse.json(u);
  }
  const ev: BookingEvent | null = b.action === "cancel" ? "CANCEL" : b.action === "complete" ? "COMPLETE" : null;
  if (!ev) return err("Unknown action");
  const next = nextStatus(status, ev);
  if (!next) return err(`Invalid transition: ${status} -> ${ev}`, 409);
  // BUG-002 fix: cancelling a paid booking records a refund so payments and booking status stay consistent.
  if (ev === "CANCEL" && status === "CONFIRMED")
    await prisma.payment.create({ data: { bookingId: booking.id, amount: booking.totalAmount, status: "REFUNDED" } });
  return NextResponse.json(await prisma.booking.update({ where: { id: booking.id }, data: { status: next } }));
}
