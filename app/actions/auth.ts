"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, SESSION_MAX_AGE, verifyCredentials } from "@/lib/auth";

/* Errors come back as keys, not sentences — the sign-in screen translates
   them, so the server never has to know which locale is active. */
export type SignInState = { error?: "missing" | "invalid" };

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) return { error: "missing" };

  const person = verifyCredentials(email, password);
  if (!person) return { error: "invalid" };

  const store = await cookies();
  store.set(SESSION_COOKIE, person.id, {
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
  store.delete(SESSION_COOKIE);
  redirect("/login");
}
