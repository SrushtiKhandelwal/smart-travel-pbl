import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
export async function GET(req: Request) {
  const u = new URL(req.url);
  const source = u.searchParams.get("source") ?? undefined;
  const destination = u.searchParams.get("destination") ?? undefined;
  const services = await prisma.travelService.findMany({ where: { source, destination } });
  return NextResponse.json(services);
}
