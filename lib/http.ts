import { NextResponse } from "next/server";
export const err = (message: string, status = 400) => NextResponse.json({ error: message }, { status });
