/**
 * Same-origin proxy to the JTrax backend. The session token lives in an
 * httpOnly cookie, so client code can never read it — every browser API call
 * comes here and the Authorization header is attached server-side.
 */
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";

const API_BASE = process.env.JTRAX_API_URL ?? "http://localhost:8790";

async function forward(req: NextRequest, params: Promise<{ path: string[] }>) {
  const { path } = await params;
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  const url = `${API_BASE}/api/v1/${path.join("/")}${req.nextUrl.search}`;
  const init: RequestInit = {
    method: req.method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
  };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.text();
  }

  let upstream: Response;
  try {
    upstream = await fetch(url, init);
  } catch {
    return NextResponse.json({ error: "backend unreachable" }, { status: 502 });
  }
  const body = await upstream.text();
  return new NextResponse(body, {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return forward(req, ctx.params);
}
export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return forward(req, ctx.params);
}
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return forward(req, ctx.params);
}
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return forward(req, ctx.params);
}
