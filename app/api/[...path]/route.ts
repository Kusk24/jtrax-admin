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
  // Almost every call here is JSON, but a scanned registration form arrives as
  // multipart. That body must be forwarded byte for byte with its own content
  // type: overwriting the type drops the multipart boundary, and reading an
  // image with text() corrupts it.
  const contentType = req.headers.get("content-type") ?? "";
  const isJSON = contentType === "" || contentType.includes("application/json");
  const init: RequestInit = {
    method: req.method,
    headers: {
      "Content-Type": isJSON ? "application/json" : contentType,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
  };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = isJSON ? await req.text() : await req.arrayBuffer();
  }

  // A game's event stream never ends, so it must not be buffered — and it must
  // be abortable, or the upstream connection outlives the browser tab.
  const wantsStream = req.headers.get("accept")?.includes("text/event-stream");
  if (wantsStream) init.signal = req.signal;

  let upstream: Response;
  try {
    upstream = await fetch(url, init);
  } catch {
    return NextResponse.json({ error: "backend unreachable" }, { status: 502 });
  }

  if (wantsStream && upstream.body && upstream.headers.get("content-type")?.includes("text/event-stream")) {
    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        // Vercel and nginx both buffer by default, which would hold every
        // event until the response ended — that is, until the game did.
        "X-Accel-Buffering": "no",
      },
    });
  }

  // Almost every reply is JSON, but a tournament regulation is a PDF or a
  // photo. Reading those with text() corrupts them, and answering
  // application/json makes the browser save the bytes instead of showing
  // them — so anything that is not JSON passes through untouched, with the
  // type and filename the backend chose.
  const upstreamType = upstream.headers.get("content-type") ?? "";
  if (upstreamType && !upstreamType.includes("application/json")) {
    const headers = new Headers({ "Content-Type": upstreamType });
    const disposition = upstream.headers.get("content-disposition");
    if (disposition) headers.set("Content-Disposition", disposition);
    return new NextResponse(await upstream.arrayBuffer(), {
      status: upstream.status,
      headers,
    });
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
export async function PUT(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return forward(req, ctx.params);
}
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return forward(req, ctx.params);
}
