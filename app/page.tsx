"use client";
import { useEffect, useState } from "react";

type Svc = { id: number; type: string; name: string; source: string; destination: string; price: number; available: boolean };
type Bk = { id: number; status: string; totalAmount: number; passengers: number; travelDate: string; service: Svc };

async function api(path: string, method = "GET", body?: unknown) {
  const r = await fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, j };
}

export default function Home() {
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [msg, setMsg] = useState("");
  const [f, setF] = useState({ name: "", email: "", password: "" });
  const [svcs, setSvcs] = useState<Svc[]>([]);
  const [bks, setBks] = useState<Bk[]>([]);
  const [q, setQ] = useState({ passengers: "1", travelDate: "" });

  async function refresh() {
    const p = await api("/api/profile");
    setUser(p.ok ? p.j : null);
    setSvcs((await api("/api/services")).j);
    if (p.ok) setBks((await api("/api/bookings")).j);
  }
  useEffect(() => { setQ((x) => ({ ...x, travelDate: new Date().toISOString().slice(0, 10) })); refresh(); }, []);
  const show = (r: { ok: boolean; j: { error?: string } }, ok: string) => setMsg(r.ok ? ok : r.j.error ?? "Error");

  async function book(id: number) {
    const r = await api("/api/bookings", "POST", { serviceId: id, passengers: Number(q.passengers), travelDate: q.travelDate });
    show(r, "Booking created (PENDING). Pay to confirm."); refresh();
  }
  async function act(id: number, action: string, cardToken?: string) {
    const r = await api("/api/bookings/action", "POST", { bookingId: id, action, cardToken });
    show(r, `Done: ${action}`); refresh();
  }
  const input = "border rounded px-2 py-1 text-sm";
  const btn = "rounded bg-blue-600 text-white px-3 py-1 text-sm disabled:opacity-40";

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6 text-sm">
      <h1 className="text-2xl font-bold">Smart Travel Management System</h1>
      {msg && <div id="msg" className="p-2 rounded bg-yellow-100">{msg}</div>}
      {!user ? (
        <section className="space-y-2 border rounded p-4">
          <h2 className="font-semibold">Register / Login</h2>
          <div className="flex gap-2 flex-wrap">
            <input className={input} placeholder="Name (register)" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
            <input className={input} placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
            <input className={input} placeholder="Password (8-20)" type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <button className={btn} onClick={async () => show(await api("/api/register", "POST", f), "Registered. Now login.")}>Register</button>
            <button className={btn} onClick={async () => { const r = await api("/api/login", "POST", f); show(r, "Logged in"); refresh(); }}>Login</button>
          </div>
        </section>
      ) : (
        <section className="flex items-center justify-between border rounded p-4">
          <span>Logged in as <b>{user.name}</b> ({user.email})</span>
          <button className={btn} onClick={async () => { await api("/api/logout", "POST"); setBks([]); setUser(null); setMsg("Logged out"); }}>Logout</button>
        </section>
      )}
      <section className="space-y-2 border rounded p-4">
        <h2 className="font-semibold">Available services</h2>
        <div className="flex gap-2">
          <label>Passengers <input className={input + " w-16"} value={q.passengers} onChange={(e) => setQ({ ...q, passengers: e.target.value })} /></label>
          <label>Date <input className={input} type="date" value={q.travelDate} onChange={(e) => setQ({ ...q, travelDate: e.target.value })} /></label>
        </div>
        {svcs.map((s) => (
          <div key={s.id} className="flex justify-between items-center border-b py-1">
            <span>{s.type} | {s.name} | {s.source} to {s.destination} | Rs {s.price} {s.available ? "" : "(unavailable)"}</span>
            <button className={btn} onClick={() => book(s.id)}>Book</button>
          </div>
        ))}
      </section>
      {user && (
        <section className="space-y-2 border rounded p-4">
          <h2 className="font-semibold">My bookings</h2>
          {bks.map((b) => (
            <div key={b.id} className="flex justify-between items-center border-b py-1">
              <span>#{b.id} {b.service.name} | {b.passengers} pax | Rs {b.totalAmount} | <b>{b.status}</b></span>
              <span className="flex gap-1">
                <button className={btn} disabled={b.status !== "PENDING"} onClick={() => act(b.id, "pay", "tok_ok")}>Pay (sandbox)</button>
                <button className={btn} disabled={b.status !== "PENDING"} onClick={() => act(b.id, "pay", "tok_fail")}>Pay (fail)</button>
                <button className={btn} disabled={b.status === "CANCELLED" || b.status === "COMPLETED"} onClick={() => act(b.id, "cancel")}>Cancel</button>
                <button className={btn} disabled={b.status !== "CONFIRMED"} onClick={() => act(b.id, "complete")}>Complete trip</button>
              </span>
            </div>
          ))}
        </section>
      )}
      <p className="text-xs text-gray-500">Sandbox payment only. No real charges.</p>
    </main>
  );
}
