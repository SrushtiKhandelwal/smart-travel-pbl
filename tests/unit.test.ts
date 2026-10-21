import { describe, it, expect } from "vitest";
import { validatePassword, validateEmail, validatePassengers, validateTravelDate } from "@/lib/validation";
import { nextStatus, totalAmount } from "@/lib/bookingState";
import { simulatePayment } from "@/lib/payment";

const pw = (n: number) => "Ab1!".padEnd(n, "x");
describe("UT: password length (BVA 8-20, assumption)", () => {
  it("UT-01 7 chars rejected", () => expect(validatePassword(pw(7))).not.toBeNull());
  it("UT-02 8 chars accepted", () => expect(validatePassword(pw(8))).toBeNull());
  it("UT-03 9 chars accepted", () => expect(validatePassword(pw(9))).toBeNull());
  it("UT-04 19 chars accepted", () => expect(validatePassword(pw(19))).toBeNull());
  it("UT-05 20 chars accepted", () => expect(validatePassword(pw(20))).toBeNull());
  it("UT-06 21 chars rejected", () => expect(validatePassword(pw(21))).not.toBeNull());
  it("UT-07 empty rejected", () => expect(validatePassword("")).not.toBeNull());
});
describe("UT: password rules (EP) - regression for BUG-001", () => {
  it("UT-33 all lowercase rejected", () => expect(validatePassword("aaaaaaaa")).not.toBeNull());
  it("UT-34 no digit rejected", () => expect(validatePassword("Abcdefg!")).not.toBeNull());
  it("UT-35 no special char rejected", () => expect(validatePassword("Abcdefg1")).not.toBeNull());
  it("UT-36 no uppercase rejected", () => expect(validatePassword("abcdef1!")).not.toBeNull());
  it("UT-37 meets all rules accepted", () => expect(validatePassword("Passw0rd!")).toBeNull());
});
describe("UT: email (EP)", () => {
  it("UT-08 valid email accepted", () => expect(validateEmail("a@b.com")).toBeNull());
  it("UT-09 no @ rejected", () => expect(validateEmail("ab.com")).not.toBeNull());
  it("UT-10 blank rejected", () => expect(validateEmail("")).not.toBeNull());
});
describe("UT: passengers (BVA 1-9, assumption)", () => {
  for (const [id, n, ok] of [["UT-11", 0, false], ["UT-12", 1, true], ["UT-13", 2, true], ["UT-14", 8, true], ["UT-15", 9, true], ["UT-16", 10, false], ["UT-17", 1.5, false]] as const)
    it(`${id} passengers=${n} ${ok ? "accepted" : "rejected"}`, () => expect(validatePassengers(n) === null).toBe(ok));
  it("UT-18 non-number string rejected", () => expect(validatePassengers("two")).not.toBeNull());
});
describe("UT: travel date (BVA today-or-later, assumption)", () => {
  const today = new Date("2026-10-15T10:00:00Z");
  it("UT-19 yesterday rejected", () => expect(validateTravelDate("2026-10-14", today)).not.toBeNull());
  it("UT-20 today accepted", () => expect(validateTravelDate("2026-10-15", today)).toBeNull());
  it("UT-21 tomorrow accepted", () => expect(validateTravelDate("2026-10-16", today)).toBeNull());
  it("UT-22 impossible date rejected", () => expect(validateTravelDate("2026-02-30", today)).not.toBeNull());
});
describe("UT: booking state machine (state transition)", () => {
  it("UT-23 PENDING + PAY_SUCCESS = CONFIRMED", () => expect(nextStatus("PENDING", "PAY_SUCCESS")).toBe("CONFIRMED"));
  it("UT-24 CONFIRMED + COMPLETE = COMPLETED", () => expect(nextStatus("CONFIRMED", "COMPLETE")).toBe("COMPLETED"));
  it("UT-25 PENDING + CANCEL = CANCELLED", () => expect(nextStatus("PENDING", "CANCEL")).toBe("CANCELLED"));
  it("UT-26 PENDING + COMPLETE invalid", () => expect(nextStatus("PENDING", "COMPLETE")).toBeNull());
  it("UT-27 CANCELLED + PAY_SUCCESS invalid", () => expect(nextStatus("CANCELLED", "PAY_SUCCESS")).toBeNull());
  it("UT-28 COMPLETED + CANCEL invalid", () => expect(nextStatus("COMPLETED", "CANCEL")).toBeNull());
});
describe("UT: amount + sandbox payment", () => {
  it("UT-29 total = price x passengers", () => expect(totalAmount(900, 3)).toBe(2700));
  it("UT-30 normal token succeeds", () => expect(simulatePayment("tok_ok", 100)).toBe("SUCCESS"));
  it("UT-31 tok_fail declined", () => expect(simulatePayment("tok_fail", 100)).toBe("FAILED"));
  it("UT-32 zero amount fails", () => expect(simulatePayment("tok_ok", 0)).toBe("FAILED"));
});
