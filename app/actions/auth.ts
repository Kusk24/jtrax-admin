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
