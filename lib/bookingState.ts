// Booking lifecycle from the SRS: PENDING -> CONFIRMED -> COMPLETED, or CANCELLED.
export type BookingStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
export type BookingEvent = "PAY_SUCCESS" | "CANCEL" | "COMPLETE";

const table: Record<BookingStatus, Partial<Record<BookingEvent, BookingStatus>>> = {
  PENDING: { PAY_SUCCESS: "CONFIRMED", CANCEL: "CANCELLED" },
  CONFIRMED: { COMPLETE: "COMPLETED", CANCEL: "CANCELLED" },
  COMPLETED: {},
  CANCELLED: {},
};

export function nextStatus(current: BookingStatus, event: BookingEvent): BookingStatus | null {
  return table[current][event] ?? null; // null = invalid transition
}

export function totalAmount(price: number, passengers: number): number {
  return price * passengers;
}
