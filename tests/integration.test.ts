import { describe, it, expect, beforeAll } from "vitest";
import { PrismaClient } from "@prisma/client";

const BASE = process.env.STP_BASE_URL || "http://localhost:3100";
const prisma = new PrismaClient();
const today = new Date().toISOString().slice(0, 10);
const day = (n: number) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

class Client {
  cookie = "";
  async call(path: string, method = "GET", body?: unknown) {
    const r = await fetch(BASE + path, { method, headers: { "Content-Type": "application/json", cookie: this.cookie }, body: body ? JSON.stringify(body) : undefined });
    const sc = r.headers.get("set-cookie");
    if (sc) this.cookie = sc.split(";")[0].endsWith("=") ? "" : sc.split(";")[0];
    return { status: r.status, j: await r.json().catch(() => ({})) };
  }
}
const PW = "Passw0rd!";
let flightId = 0, soldOutId = 0;
beforeAll(async () => {
  // These integration tests reset rows. Refuse to run against an existing app database.
  if (process.env.STP_TEST_DATABASE !== "1" || !process.env.DATABASE_URL?.includes("stp-test-")) {
    throw new Error("Integration tests require STP_TEST_DATABASE=1 and an isolated stp-test- SQLite database");
  }
  await prisma.payment.deleteMany(); await prisma.booking.deleteMany(); await prisma.traveler.deleteMany();
  flightId = (await prisma.travelService.findFirstOrThrow({ where: { available: true } })).id;
  soldOutId = (await prisma.travelService.findFirstOrThrow({ where: { available: false } })).id;
});
async function newUser(email: string) {
  const c = new Client();
  await c.call("/api/register", "POST", { name: "Test User", email, password: PW });
  const l = await c.call("/api/login", "POST", { email, password: PW });
  expect(l.status).toBe(200);
  return c;
}

describe("User Management module (API)", () => {
  it("IT-01 register valid user -> 201 (functional)", async () => {
    const r = await new Client().call("/api/register", "POST", { name: "Asha", email: "asha@example.test", password: PW });
    expect(r.status).toBe(201);
  });
  it("IT-02 duplicate email -> 409 (EP)", async () => {
    const r = await new Client().call("/api/register", "POST", { name: "Asha", email: "asha@example.test", password: PW });
    expect(r.status).toBe(409);
  });
  it("IT-03 register password 7 chars -> 400 (BVA)", async () => {
    expect((await new Client().call("/api/register", "POST", { name: "X", email: "b7@example.test", password: "Ab1!xyz" })).status).toBe(400);
  });
  it("IT-04 register password 8 chars -> 201 (BVA)", async () => {
    expect((await new Client().call("/api/register", "POST", { name: "X", email: "b8@example.test", password: "Ab1!xyzw" })).status).toBe(201);
  });
  it("IT-05 register password 20 chars -> 201 (BVA)", async () => {
    expect((await new Client().call("/api/register", "POST", { name: "X", email: "b20@example.test", password: "Ab1!abcdefghijklmnop" })).status).toBe(201);
  });
  it("IT-06 register password 21 chars -> 400 (BVA)", async () => {
    expect((await new Client().call("/api/register", "POST", { name: "X", email: "b21@example.test", password: "Ab1!abcdefghijklmnopq" })).status).toBe(400);
  });
  it("IT-07 login valid -> 200 + session (EP)", async () => {
    const c = new Client();
    const r = await c.call("/api/login", "POST", { email: "asha@example.test", password: PW });
    expect(r.status).toBe(200); expect(c.cookie).toContain("stp_session");
  });
  it("IT-08 login wrong password -> 401 (EP)", async () => {
    expect((await new Client().call("/api/login", "POST", { email: "asha@example.test", password: "Wrong123!" })).status).toBe(401);
  });
  it("IT-09 login blank fields -> 400 (EP)", async () => {
    expect((await new Client().call("/api/login", "POST", { email: "", password: "" })).status).toBe(400);
  });
  it("IT-10 profile without login -> 401 (SRS: login required)", async () => {
    expect((await new Client().call("/api/profile")).status).toBe(401);
  });
  it("IT-11 edit profile saves name + phone (functional)", async () => {
    const c = await newUser("prof@example.test");
    const r = await c.call("/api/profile", "PUT", { name: "New Name", phone: "9876543210" });
    expect(r.status).toBe(200);
    expect((await c.call("/api/profile")).j.name).toBe("New Name");
  });
  it("IT-12 profile phone with 9 digits -> 400 (BVA)", async () => {
    const c = await newUser("ph9@example.test");
    expect((await c.call("/api/profile", "PUT", { phone: "987654321" })).status).toBe(400);
  });
  it("IT-13 logout ends session (functional)", async () => {
    const c = await newUser("out@example.test");
    await c.call("/api/logout", "POST");
    expect((await c.call("/api/profile")).status).toBe(401);
  });
  it("IT-14 5 wrong passwords lock the account (SRS: limit invalid logins)", async () => {
    await new Client().call("/api/register", "POST", { name: "L", email: "lock@example.test", password: PW });
    const c = new Client();
    for (let i = 0; i < 5; i++) await c.call("/api/login", "POST", { email: "lock@example.test", password: "Wrong123!" });
    expect((await c.call("/api/login", "POST", { email: "lock@example.test", password: PW })).status).toBe(429);
  });
});

describe("Booking + Payment module (API)", () => {
  it("IT-15 booking without login -> 401 (SRS: login required)", async () => {
    expect((await new Client().call("/api/bookings", "POST", { serviceId: flightId, passengers: 1, travelDate: today })).status).toBe(401);
  });
  it("IT-16 create booking -> PENDING, not confirmed (SRS)", async () => {
    const c = await newUser("bk1@example.test");
    const r = await c.call("/api/bookings", "POST", { serviceId: flightId, passengers: 2, travelDate: day(1) });
    expect(r.status).toBe(201); expect(r.j.status).toBe("PENDING"); expect(r.j.totalAmount).toBe(9000);
  });
  it("IT-17 unavailable service -> 409, no booking row (decision table R3)", async () => {
    const c = await newUser("bk2@example.test");
    const r = await c.call("/api/bookings", "POST", { serviceId: soldOutId, passengers: 1, travelDate: day(1) });
    expect(r.status).toBe(409);
    expect((await c.call("/api/bookings")).j.length).toBe(0);
  });
  it("IT-18 pay success -> CONFIRMED (decision table R1)", async () => {
    const c = await newUser("bk3@example.test");
    const b = (await c.call("/api/bookings", "POST", { serviceId: flightId, passengers: 1, travelDate: day(1) })).j;
    const r = await c.call("/api/bookings/action", "POST", { bookingId: b.id, action: "pay", cardToken: "tok_ok" });
    expect(r.status).toBe(200); expect(r.j.status).toBe("CONFIRMED");
  });
  it("IT-19 pay fails -> 402, stays PENDING (decision table R2)", async () => {
    const c = await newUser("bk4@example.test");
    const b = (await c.call("/api/bookings", "POST", { serviceId: flightId, passengers: 1, travelDate: day(1) })).j;
    const r = await c.call("/api/bookings/action", "POST", { bookingId: b.id, action: "pay", cardToken: "tok_fail" });
    expect(r.status).toBe(402);
    expect((await c.call("/api/bookings")).j[0].status).toBe("PENDING");
  });
  it("IT-20 retry after failure -> CONFIRMED, one booking only (state)", async () => {
    const c = await newUser("bk5@example.test");
    const b = (await c.call("/api/bookings", "POST", { serviceId: flightId, passengers: 1, travelDate: day(1) })).j;
    await c.call("/api/bookings/action", "POST", { bookingId: b.id, action: "pay", cardToken: "tok_fail" });
    const r = await c.call("/api/bookings/action", "POST", { bookingId: b.id, action: "pay", cardToken: "tok_ok" });
    expect(r.j.status).toBe("CONFIRMED");
    const list = (await c.call("/api/bookings")).j; expect(list.length).toBe(1); expect(list[0].payments.length).toBe(2);
  });
  it("IT-21 cancel after failure -> CANCELLED (state)", async () => {
    const c = await newUser("bk6@example.test");
    const b = (await c.call("/api/bookings", "POST", { serviceId: flightId, passengers: 1, travelDate: day(1) })).j;
    await c.call("/api/bookings/action", "POST", { bookingId: b.id, action: "pay", cardToken: "tok_fail" });
    expect((await c.call("/api/bookings/action", "POST", { bookingId: b.id, action: "cancel" })).j.status).toBe("CANCELLED");
  });
  it("IT-22 pay on CANCELLED refused -> 409 (invalid transition)", async () => {
    const c = await newUser("bk7@example.test");
    const b = (await c.call("/api/bookings", "POST", { serviceId: flightId, passengers: 1, travelDate: day(1) })).j;
    await c.call("/api/bookings/action", "POST", { bookingId: b.id, action: "cancel" });
    expect((await c.call("/api/bookings/action", "POST", { bookingId: b.id, action: "pay", cardToken: "tok_ok" })).status).toBe(409);
  });
  it("IT-23 complete trip on unpaid PENDING refused -> 409 (invalid transition)", async () => {
    const c = await newUser("bk8@example.test");
    const b = (await c.call("/api/bookings", "POST", { serviceId: flightId, passengers: 1, travelDate: day(1) })).j;
    expect((await c.call("/api/bookings/action", "POST", { bookingId: b.id, action: "complete" })).status).toBe(409);
  });
  it("IT-24 CONFIRMED -> COMPLETED (state)", async () => {
    const c = await newUser("bk9@example.test");
    const b = (await c.call("/api/bookings", "POST", { serviceId: flightId, passengers: 1, travelDate: day(1) })).j;
    await c.call("/api/bookings/action", "POST", { bookingId: b.id, action: "pay", cardToken: "tok_ok" });
    expect((await c.call("/api/bookings/action", "POST", { bookingId: b.id, action: "complete" })).j.status).toBe("COMPLETED");
  });
  it("IT-25 service goes unavailable before payment -> 409, no payment row (SRS undesired event)", async () => {
    const c = await newUser("bk10@example.test");
    const b = (await c.call("/api/bookings", "POST", { serviceId: flightId, passengers: 1, travelDate: day(1) })).j;
    await prisma.travelService.update({ where: { id: flightId }, data: { available: false } });
    const r = await c.call("/api/bookings/action", "POST", { bookingId: b.id, action: "pay", cardToken: "tok_ok" });
    await prisma.travelService.update({ where: { id: flightId }, data: { available: true } });
    expect(r.status).toBe(409);
    expect(await prisma.payment.count({ where: { bookingId: b.id } })).toBe(0);
  });
  it("IT-26 passengers 0 -> 400 (BVA)", async () => {
    const c = await newUser("bk11@example.test");
    expect((await c.call("/api/bookings", "POST", { serviceId: flightId, passengers: 0, travelDate: day(1) })).status).toBe(400);
  });
  it("IT-27 passengers 9 -> 201, 10 -> 400 (BVA)", async () => {
    const c = await newUser("bk12@example.test");
    expect((await c.call("/api/bookings", "POST", { serviceId: flightId, passengers: 9, travelDate: day(1) })).status).toBe(201);
    expect((await c.call("/api/bookings", "POST", { serviceId: flightId, passengers: 10, travelDate: day(1) })).status).toBe(400);
  });
  it("IT-28 passengers 1.5 -> 400 (EP)", async () => {
    const c = await newUser("bk13@example.test");
    expect((await c.call("/api/bookings", "POST", { serviceId: flightId, passengers: 1.5, travelDate: day(1) })).status).toBe(400);
  });
  it("IT-29 past date -> 400, today -> 201 (BVA)", async () => {
    const c = await newUser("bk14@example.test");
    expect((await c.call("/api/bookings", "POST", { serviceId: flightId, passengers: 1, travelDate: day(-1) })).status).toBe(400);
    expect((await c.call("/api/bookings", "POST", { serviceId: flightId, passengers: 1, travelDate: today })).status).toBe(201);
  });
  it("IT-30 user cannot pay another user's booking -> 404 (access control)", async () => {
    const a = await newUser("own1@example.test"), o = await newUser("own2@example.test");
    const b = (await a.call("/api/bookings", "POST", { serviceId: flightId, passengers: 1, travelDate: day(1) })).j;
    expect((await o.call("/api/bookings/action", "POST", { bookingId: b.id, action: "pay", cardToken: "tok_ok" })).status).toBe(404);
  });
  it("IT-32 cancel a CONFIRMED booking records a refund (regression BUG-002)", async () => {
    const c = await newUser("ref@example.test");
    const b = (await c.call("/api/bookings", "POST", { serviceId: flightId, passengers: 1, travelDate: day(1) })).j;
    await c.call("/api/bookings/action", "POST", { bookingId: b.id, action: "pay", cardToken: "tok_ok" });
    expect((await c.call("/api/bookings/action", "POST", { bookingId: b.id, action: "cancel" })).j.status).toBe("CANCELLED");
    const pays = await prisma.payment.findMany({ where: { bookingId: b.id }, orderBy: { id: "asc" } });
    expect(pays.map((p) => p.status)).toEqual(["SUCCESS", "REFUNDED"]);
  });
  it("IT-33 weak password rejected at registration (regression BUG-001)", async () => {
    expect((await new Client().call("/api/register", "POST", { name: "W", email: "weak@example.test", password: "aaaaaaaa" })).status).toBe(400);
  });
  it("IT-31 end to end: register -> login -> book -> pay -> history (integration)", async () => {
    const c = new Client();
    expect((await c.call("/api/register", "POST", { name: "E2E", email: "e2e@example.test", password: PW })).status).toBe(201);
    expect((await c.call("/api/login", "POST", { email: "e2e@example.test", password: PW })).status).toBe(200);
    const b = (await c.call("/api/bookings", "POST", { serviceId: flightId, passengers: 3, travelDate: day(2) })).j;
    expect((await c.call("/api/bookings/action", "POST", { bookingId: b.id, action: "pay", cardToken: "tok_ok" })).j.status).toBe("CONFIRMED");
    const h = (await c.call("/api/bookings")).j;
    expect(h[0].status).toBe("CONFIRMED"); expect(h[0].totalAmount).toBe(13500);
  });
});
