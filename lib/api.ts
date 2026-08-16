/**
 * Browser-side API client. Every call goes to the same-origin /api proxy,
 * which attaches the httpOnly session token and forwards to jtrax-backend.
 */

export class ApiError extends Error {
  status: number;
  /** The decoded error payload. Some endpoints answer a failure with more than
      a message — the LINE composer returns the reason it could not deliver,
      and the message it recorded anyway — and that is lost if only the string
      survives. */
  body: unknown;
  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api/${path}`, {
    method,
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  if (res.status === 401 && typeof window !== "undefined") {
    window.location.href = "/login";
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, (data as { error?: string }).error ?? `request failed (${res.status})`, data);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body: unknown) => request<T>("POST", path, body),
  patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, body),
  put: <T>(path: string, body: unknown) => request<T>("PUT", path, body),
  del: <T>(path: string) => request<T>("DELETE", path),
};
