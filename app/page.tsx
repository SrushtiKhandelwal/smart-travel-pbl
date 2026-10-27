"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Bus,
  CalendarDays,
  Check,
  CheckCircle2,
  CircleUserRound,
  Compass,
  CreditCard,
  Hotel,
  Info,
  LogOut,
  MapPin,
  Plane,
  Pencil,
  ShieldCheck,
  Sparkles,
  Ticket,
  TrainFront,
  Users,
  X,
} from "lucide-react";
import styles from "./page.module.css";

type Service = {
  id: number;
  type: string;
  name: string;
  source: string;
  destination: string;
  price: number;
  available: boolean;
};

type Booking = {
  id: number;
  status: string;
  totalAmount: number;
  passengers: number;
  travelDate: string;
  service: Service;
};

type Traveler = { name: string; email: string; phone: string | null };
type Notice = { text: string; tone: "success" | "error" | "info" };
type ApiResult<T> = { ok: boolean; data: T; error?: string };

const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

async function api<T>(path: string, method = "GET", body?: unknown): Promise<ApiResult<T>> {
  try {
    const response = await fetch(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    return {
      ok: response.ok,
      data: data as T,
      error: typeof data?.error === "string" ? data.error : undefined,
    };
  } catch {
    return { ok: false, data: {} as T, error: "Could not connect. Please try again." };
  }
}

async function loadSnapshot() {
  const [profile, services] = await Promise.all([
    api<Traveler>("/api/profile"),
    api<Service[]>("/api/services"),
  ]);
  const bookings = profile.ok ? await api<Booking[]>("/api/bookings") : null;
  return { profile, services, bookings };
}

function serviceIcon(type: string) {
  switch (type) {
    case "FLIGHT": return <Plane size={22} strokeWidth={1.8} />;
    case "TRAIN": return <TrainFront size={22} strokeWidth={1.8} />;
    case "BUS": return <Bus size={22} strokeWidth={1.8} />;
    case "HOTEL": return <Hotel size={22} strokeWidth={1.8} />;
    default: return <Compass size={22} strokeWidth={1.8} />;
  }
}

function travelDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

export default function Home() {
  const [user, setUser] = useState<Traveler | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [services, setServices] = useState<Service[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [trip, setTrip] = useState({ passengers: "1", travelDate: "" });
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", phone: "" });
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadInitial() {
      const snapshot = await loadSnapshot();
      if (!active) return;
      setUser(snapshot.profile.ok ? snapshot.profile.data : null);
      setServices(Array.isArray(snapshot.services.data) ? snapshot.services.data : []);
      setBookings(snapshot.bookings?.ok && Array.isArray(snapshot.bookings.data) ? snapshot.bookings.data : []);
      setTrip((current) => current.travelDate ? current : {
        ...current,
        travelDate: new Date().toISOString().slice(0, 10),
      });
      if (!snapshot.services.ok) {
        setNotice({ text: snapshot.services.error ?? "Services could not be loaded.", tone: "error" });
      }
      setLoading(false);
    }
    void loadInitial();
    return () => { active = false; };
  }, []);

  async function refresh() {
    const snapshot = await loadSnapshot();
    setUser(snapshot.profile.ok ? snapshot.profile.data : null);
    setServices(Array.isArray(snapshot.services.data) ? snapshot.services.data : []);
    setBookings(snapshot.bookings?.ok && Array.isArray(snapshot.bookings.data) ? snapshot.bookings.data : []);
  }

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("auth");
    const isRegistering = authMode === "register";
    const response = await api<{ name: string }>(
      isRegistering ? "/api/register" : "/api/login",
      "POST",
      isRegistering ? form : { email: form.email, password: form.password },
    );
    if (response.ok) {
      if (isRegistering) {
        setAuthMode("login");
        setForm((current) => ({ ...current, password: "" }));
        setNotice({ text: "Account created. Sign in to start booking.", tone: "success" });
      } else {
        await refresh();
        setForm((current) => ({ ...current, password: "" }));
        setNotice({ text: "You're signed in. Your trips are ready below.", tone: "success" });
      }
    } else {
      setNotice({ text: response.error ?? "Please check your details and try again.", tone: "error" });
    }
    setBusy(null);
  }

  async function handleLogout() {
    setBusy("logout");
    const response = await api<{ ok: boolean }>("/api/logout", "POST");
    if (response.ok) {
      setUser(null);
      setBookings([]);
      setEditingProfile(false);
      setProfileError(null);
      setAuthMode("login");
      setNotice({ text: "You have been signed out.", tone: "info" });
    } else {
      setNotice({ text: response.error ?? "Sign out failed. Please try again.", tone: "error" });
    }
    setBusy(null);
  }

  function openProfileEditor() {
    if (!user) return;
    setProfileForm({ name: user.name, phone: user.phone ?? "" });
    setProfileError(null);
    setEditingProfile(true);
  }

  async function handleProfileSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    const name = profileForm.name.trim();
    const phone = profileForm.phone.trim();
    if (!name) {
      setProfileError("Please enter your name.");
      return;
    }
    if (phone && !/^\d{10}$/.test(phone)) {
      setProfileError("Phone number must contain exactly 10 digits.");
      return;
    }

    setBusy("profile");
    setProfileError(null);
    const response = await api<Traveler>("/api/profile", "PUT", { name, phone: phone || null });
    if (response.ok) {
      setUser(response.data);
      setEditingProfile(false);
      setNotice({ text: "Profile updated.", tone: "success" });
    } else {
      setProfileError(response.error ?? "Profile could not be updated. Please try again.");
    }
    setBusy(null);
  }

  async function handleBook(service: Service) {
    if (!user) {
      setAuthMode("login");
      setNotice({ text: "Sign in to reserve this service.", tone: "info" });
      document.getElementById("account")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setBusy("book-" + service.id);
    const response = await api<Booking>("/api/bookings", "POST", {
      serviceId: service.id,
      passengers: Number(trip.passengers),
      travelDate: trip.travelDate,
    });
    setNotice(response.ok
      ? { text: "Booking created. Complete the sandbox payment in My trips to confirm it.", tone: "success" }
      : { text: response.error ?? "Booking could not be created.", tone: "error" });
    if (response.ok) await refresh();
    setBusy(null);
  }

  async function handleBookingAction(booking: Booking, action: "pay" | "cancel" | "complete", cardToken?: string) {
    setBusy("booking-" + booking.id);
    const response = await api<Booking>("/api/bookings/action", "POST", {
      bookingId: booking.id,
      action,
      cardToken,
    });
    const successText = action === "pay"
      ? "Sandbox payment approved. Your booking is confirmed."
      : action === "cancel"
        ? "Booking cancelled. A sandbox refund was recorded if it had been paid."
        : "Trip marked completed.";
    setNotice(response.ok
      ? { text: successText, tone: "success" }
      : { text: response.error ?? "This action could not be completed.", tone: "error" });
    await refresh();
    setBusy(null);
  }

  return (
    <div className={styles.page} id="top">
      <header className={styles.siteHeader}>
        <div className={styles.headerInner}>
          <a className={styles.brand} href="#top" aria-label="Smart Travel home">
            <span className={styles.brandMark}><Compass size={24} strokeWidth={2.2} /></span>
            <span className={styles.brandWords}><strong>smart travel</strong><small>MANAGEMENT SYSTEM</small></span>
          </a>
          <nav className={styles.nav} aria-label="Main navigation">
            <a href="#explore">Explore</a>
            <a href={user ? "#trips" : "#account"}>{user ? "My trips" : "Account"}</a>
          </nav>
          <div className={styles.headerMeta}>
            <span className={styles.demoBadge}><span /> Sandbox demo</span>
            {user && <span className={styles.headerUser}>{user.name.split(" ")[0]}</span>}
          </div>
        </div>
      </header>

      <main className={styles.main}>
        {notice && (
          <div id="msg" role="status" className={styles.notice} data-tone={notice.tone}>
            {notice.tone === "success" ? <CheckCircle2 size={19} /> : <Info size={19} />}
            <span>{notice.text}</span>
            <button type="button" aria-label="Dismiss message" onClick={() => setNotice(null)}><X size={17} /></button>
          </div>
        )}

        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}><Sparkles size={15} /> TRAVEL, SIMPLIFIED</span>
            <h1 id="hero-title">Make room for <em>the journey.</em></h1>
            <p>Browse routes, reserve a service, and keep every trip moving from one simple place.</p>
            <a className={styles.heroLink} href="#explore">Explore journeys <ArrowRight size={18} /></a>
            <div className={styles.heroProof}>
              <span><Check size={15} /> Clear prices</span>
              <span><Check size={15} /> Trips in one view</span>
            </div>
          </div>
          <div className={styles.heroArt} aria-hidden="true">
            <div className={styles.orbitOne} />
            <div className={styles.orbitTwo} />
            <div className={styles.artSpark}><Sparkles size={20} /></div>
            <div className={styles.journeyCard}>
              <div className={styles.journeyTop}><span>JOURNEY PREVIEW</span><Compass size={19} /></div>
              <div className={styles.journeyRoute}>
                <div><strong>NGP</strong><span>Nagpur</span></div>
                <div className={styles.routeTrack}><span /><Plane size={22} fill="currentColor" /><span /></div>
                <div><strong>BOM</strong><span>Mumbai</span></div>
              </div>
              <div className={styles.journeyDivider} />
              <div className={styles.journeyFoot}><span>GO SOMEWHERE GOOD</span><ArrowUpRight size={19} /></div>
            </div>
            <div className={styles.artLabel}><MapPin size={16} /> Your next stop awaits</div>
          </div>
        </section>

        <section className={styles.tripPlanner} aria-labelledby="planner-heading">
          <div className={styles.plannerIntro}>
            <span className={styles.plannerIcon}><Ticket size={22} /></span>
            <div><small>BEFORE YOU BOOK</small><h2 id="planner-heading">Set your trip details</h2></div>
          </div>
          <div className={styles.plannerFields}>
            <label htmlFor="passengers"><span><Users size={16} /> Passengers</span><input id="passengers" type="number" min="1" max="9" step="1" inputMode="numeric" value={trip.passengers} onChange={(event) => setTrip({ ...trip, passengers: event.target.value })} /></label>
            <label htmlFor="travel-date"><span><CalendarDays size={16} /> Travel date</span><input id="travel-date" type="date" value={trip.travelDate} onChange={(event) => setTrip({ ...trip, travelDate: event.target.value })} /></label>
          </div>
          <p className={styles.plannerHint}>Applied when you choose a service below.</p>
        </section>

        <div className={styles.contentGrid}>
          <section className={styles.explore} id="explore" aria-labelledby="explore-heading">
            <div className={styles.sectionHeading}>
              <div><span className={styles.sectionKicker}>FIND YOUR WAY</span><h2 id="explore-heading">Available journeys</h2><p>Pick the route or stay that fits your plan.</p></div>
              {!loading && <span className={styles.countPill}>{services.length} {services.length === 1 ? "service" : "services"}</span>}
            </div>
            {loading ? (
              <div className={styles.emptyState}>Loading journeys…</div>
            ) : services.length === 0 ? (
              <div className={styles.emptyState}>No services are available right now.</div>
            ) : (
              <div className={styles.serviceGrid}>
                {services.map((service) => (
                  <article className={styles.serviceCard} key={service.id} data-kind={service.type.toLowerCase()}>
                    <div className={styles.serviceTop}>
                      <span className={styles.serviceIcon}>{serviceIcon(service.type)}</span>
                      <span className={styles.availability} data-available={service.available}>{service.available ? "Available" : "Sold out"}</span>
                    </div>
                    <span className={styles.serviceType}>{service.type.toLowerCase()}</span>
                    <h3>{service.name}</h3>
                    <div className={styles.serviceRoute}>
                      <MapPin size={16} />
                      <span>{service.type === "HOTEL" ? "Stay in " + service.destination : service.source + "  →  " + service.destination}</span>
                    </div>
                    <div className={styles.serviceBottom}>
                      <div className={styles.price}><strong>{money.format(service.price)}</strong><span>base price</span></div>
                      <button type="button" className={styles.bookButton} disabled={!service.available || busy !== null} onClick={() => handleBook(service)}>
                        {busy === "book-" + service.id ? "Booking…" : service.available ? "Book now" : "Unavailable"}
                        {service.available && <ArrowUpRight size={17} />}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <aside className={styles.accountCard} id="account" aria-labelledby="account-heading">
            <div className={styles.accountEyebrow}><CircleUserRound size={17} /> YOUR SPACE</div>
            {user ? (
              <>
                <h2 id="account-heading">Welcome back,<br /><span>{user.name.split(" ")[0]}.</span></h2>
                <p>Your journeys, payments, and updates live together here.</p>
                <div className={styles.profilePanel}>
                  <div className={styles.profilePanelHeader}>
                    <span>ACCOUNT DETAILS</span>
                    {!editingProfile && <button type="button" onClick={openProfileEditor}><Pencil size={14} /> Edit profile</button>}
                  </div>
                  {editingProfile ? (
                    <form className={styles.profileForm} onSubmit={handleProfileSave}>
                      <label htmlFor="profile-name">Full name<input id="profile-name" type="text" autoComplete="name" maxLength={80} required value={profileForm.name} onChange={(event) => setProfileForm({ ...profileForm, name: event.target.value })} /></label>
                      <label htmlFor="profile-phone">Phone number<input id="profile-phone" type="tel" inputMode="numeric" autoComplete="tel" pattern="[0-9]{10}" maxLength={10} placeholder="Optional, 10 digits" value={profileForm.phone} onChange={(event) => setProfileForm({ ...profileForm, phone: event.target.value })} /></label>
                      <div className={styles.profileReadonly}><small>Email address · read only</small><span>{user.email}</span></div>
                      {profileError && <p className={styles.profileError} role="alert">{profileError}</p>}
                      <div className={styles.profileActions}>
                        <button className={styles.profileSave} type="submit" disabled={busy !== null}>{busy === "profile" ? "Saving…" : "Save changes"}</button>
                        <button className={styles.profileCancel} type="button" disabled={busy !== null} onClick={() => { setEditingProfile(false); setProfileError(null); }}>Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <div className={styles.profileSummary}>
                      <div><small>Full name</small><strong>{user.name}</strong></div>
                      <div><small>Email address</small><strong>{user.email}</strong></div>
                      <div><small>Phone number</small><strong>{user.phone ?? "Not added"}</strong></div>
                    </div>
                  )}
                </div>
                <div className={styles.accountStat}><span><Ticket size={19} /> Your bookings</span><strong>{bookings.length.toString().padStart(2, "0")}</strong></div>
                <a className={styles.accountLink} href="#trips">View my trips <ArrowRight size={17} /></a>
                <button className={styles.logoutButton} type="button" disabled={busy !== null} onClick={handleLogout}><LogOut size={17} /> Sign out</button>
              </>
            ) : (
              <>
                <h2 id="account-heading">Your next trip<br /><span>starts here.</span></h2>
                <p>Sign in to book a service and keep track of every update.</p>
                <div className={styles.authTabs} role="tablist" aria-label="Account access">
                  <button type="button" role="tab" aria-selected={authMode === "login"} onClick={() => setAuthMode("login")}>Sign in</button>
                  <button type="button" role="tab" aria-selected={authMode === "register"} onClick={() => setAuthMode("register")}>Create account</button>
                </div>
                <form className={styles.authForm} onSubmit={handleAuth}>
                  {authMode === "register" && <label htmlFor="name">Full name<input id="name" type="text" autoComplete="name" placeholder="Your name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>}
                  <label htmlFor="email">Email address<input id="email" type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
                  <label htmlFor="password">Password<input id="password" type="password" autoComplete={authMode === "register" ? "new-password" : "current-password"} placeholder="Enter your password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>
                  {authMode === "register" && <small className={styles.passwordHint}>8–20 characters with upper and lowercase letters, a number, and a symbol.</small>}
                  <button className={styles.authSubmit} type="submit" disabled={busy !== null}>{busy === "auth" ? "Please wait…" : authMode === "register" ? "Create account" : "Sign in"}<ArrowRight size={18} /></button>
                </form>
                <div className={styles.secureNote}><ShieldCheck size={17} /> Your account stays on this demo.</div>
              </>
            )}
          </aside>
        </div>

        {user && (
          <section className={styles.trips} id="trips" aria-labelledby="trips-heading">
            <div className={styles.sectionHeading}>
              <div><span className={styles.sectionKicker}>YOUR ITINERARY</span><h2 id="trips-heading">My trips</h2><p>See what is booked and what needs your attention.</p></div>
              <span className={styles.countPill}>{bookings.length} {bookings.length === 1 ? "booking" : "bookings"}</span>
            </div>
            {bookings.length === 0 ? (
              <div className={styles.emptyState}><Ticket size={25} /><strong>No trips yet</strong><span>Choose an available journey to create your first booking.</span></div>
            ) : (
              <div className={styles.bookingList}>
                {bookings.map((booking) => (
                  <article className={styles.bookingCard} key={booking.id}>
                    <div className={styles.bookingIcon}>{serviceIcon(booking.service.type)}</div>
                    <div className={styles.bookingMain}>
                      <div className={styles.bookingTitle}><strong>{booking.service.name}</strong><span className={styles.statusPill} data-status={booking.status}>{booking.status.toLowerCase().replace("_", " ")}</span></div>
                      <p>{booking.service.type === "HOTEL" ? "Stay in " + booking.service.destination : booking.service.source + " → " + booking.service.destination}</p>
                      <div className={styles.bookingFacts}><span><CalendarDays size={15} /> {travelDate(booking.travelDate)}</span><span><Users size={15} /> {booking.passengers} {booking.passengers === 1 ? "traveler" : "travelers"}</span><span><CreditCard size={15} /> {money.format(booking.totalAmount)}</span></div>
                    </div>
                    <div className={styles.bookingActions}>
                      <small>BOOKING #{booking.id}</small>
                      {booking.status === "PENDING" && <><button type="button" className={styles.actionPrimary} disabled={busy !== null} onClick={() => handleBookingAction(booking, "pay", "tok_ok")}>Pay in sandbox <ArrowRight size={16} /></button><button type="button" className={styles.actionGhost} disabled={busy !== null} onClick={() => handleBookingAction(booking, "pay", "tok_fail")}>Test declined payment</button><button type="button" className={styles.actionGhost} disabled={busy !== null} onClick={() => handleBookingAction(booking, "cancel")}>Cancel booking</button></>}
                      {booking.status === "CONFIRMED" && <><button type="button" className={styles.actionPrimary} disabled={busy !== null} onClick={() => handleBookingAction(booking, "complete")}>Complete trip <Check size={16} /></button><button type="button" className={styles.actionGhost} disabled={busy !== null} onClick={() => handleBookingAction(booking, "cancel")}>Cancel booking</button></>}
                      {(booking.status === "CANCELLED" || booking.status === "COMPLETED") && <span className={styles.finalState}><CheckCircle2 size={16} /> No further action needed</span>}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        <div className={styles.sandboxNote}><ShieldCheck size={17} /><span>Student project demo. Payments are simulated; no real card or charge is involved.</span></div>
      </main>
    </div>
  );
}
