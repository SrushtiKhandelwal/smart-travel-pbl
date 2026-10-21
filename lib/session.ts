import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "./db";
const secret = () => process.env.SESSION_SECRET ?? "dev";
const sign = (v: string) => createHmac("sha256", secret()).update(v).digest("hex");
export const COOKIE = "stp_session";

export function makeToken(id: number) { const v = String(id); return `${v}.${sign(v)}`; }
export function readToken(t: string | undefined): number | null {
  if (!t) return null;
  const [v, s] = t.split(".");
  if (!v || !s) return null;
  const a = Buffer.from(sign(v)), b = Buffer.from(s);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return Number(v);
}
export async function currentTraveler() {
  const jar = await cookies();
  const id = readToken(jar.get(COOKIE)?.value);
  if (!id) return null;
  return prisma.traveler.findUnique({ where: { id } });
}
