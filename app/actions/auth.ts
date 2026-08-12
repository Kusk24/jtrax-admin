"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { API_BASE, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/auth";

/* Errors come back as keys, not sentences — the sign-in screen translates
   them, so the server never has to know which locale is active. */
export type SignInState = { error?: "missing" | "invalid" | "unreachable" };

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) return { error: "missing" };

  let token: string;
  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });
    if (!res.ok) return { error: "invalid" };
    ({ token } = (await res.json()) as { token: string });
  } catch {
    return { error: "unreachable" };
  }

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    ...(formData.get("remember") ? { maxAge: SESSION_MAX_AGE } : {}),
  });

  redirect("/");
}

export async function signOut() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    fetch(`${API_BASE}/api/v1/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  }
  store.delete(SESSION_COOKIE);
  redirect("/login");
}

export type ResetRequestState = { status?: "sent"; error?: "missing" | "unreachable" };

/* The backend replies the same way whether or not the address is registered,
   so there is nothing to branch on here — which is the point. */
export async function requestPasswordReset(
  _prev: ResetRequestState,
  formData: FormData,
): Promise<ResetRequestState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "missing" };
  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
      cache: "no-store",
    });
    if (!res.ok) return { error: "unreachable" };
  } catch {
    return { error: "unreachable" };
  }
  return { status: "sent" };
}

export type ResetState = { error?: "missing" | "mismatch" | "short" | "invalid" | "unreachable" };

export async function resetPassword(_prev: ResetState, formData: FormData): Promise<ResetState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (!token || !password) return { error: "missing" };
  if (password.length < 8) return { error: "short" };
  if (password !== confirm) return { error: "mismatch" };

  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
      cache: "no-store",
    });
    /* 400 is the backend's answer for an expired, spent or unknown token. */
    if (!res.ok) return { error: res.status === 400 ? "invalid" : "unreachable" };
  } catch {
    return { error: "unreachable" };
  }
  /* The reset revoked every session for the account, so there is nothing to
     resume — back to sign-in to prove the new password. */
  redirect("/login?reset=1");
}
