import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

import { env, hasAdminPassword } from "@/lib/env";

const adminSessionCookie = "plb_admin_session";
const sessionMaxAgeSeconds = 60 * 60 * 12;

export class AdminAuthError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

function getSessionSecret() {
  return env.ADMIN_SESSION_SECRET ?? env.ADMIN_PASSWORD;
}

function sign(value: string) {
  const secret = getSessionSecret();

  if (!secret) {
    throw new AdminAuthError(
      "A senha administrativa ainda não foi configurada.",
      503,
    );
  }

  return createHmac("sha256", secret).update(value).digest("hex");
}

function safeCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export function isAdminPasswordConfigured() {
  return hasAdminPassword;
}

export function verifyAdminPassword(password: string) {
  if (!env.ADMIN_PASSWORD) {
    throw new AdminAuthError(
      "A senha administrativa ainda não foi configurada.",
      503,
    );
  }

  return safeCompare(password, env.ADMIN_PASSWORD);
}

export function createAdminSessionValue() {
  const expiresAt = Date.now() + sessionMaxAgeSeconds * 1000;
  const payload = String(expiresAt);
  const signature = sign(payload);

  return `${payload}.${signature}`;
}

export function isValidAdminSessionValue(value?: string) {
  if (!hasAdminPassword) {
    return false;
  }

  if (!value) {
    return false;
  }

  const [payload, signature] = value.split(".");
  const expiresAt = Number(payload);

  if (!payload || !signature || Number.isNaN(expiresAt)) {
    return false;
  }

  if (expiresAt < Date.now()) {
    return false;
  }

  return safeCompare(signature, sign(payload));
}

export async function isAdminAuthenticated() {
  const cookieStore = await cookies();

  return isValidAdminSessionValue(cookieStore.get(adminSessionCookie)?.value);
}

export async function requireAdminAuthenticated() {
  if (!(await isAdminAuthenticated())) {
    throw new AdminAuthError("Sessão administrativa inválida.", 401);
  }
}

export async function setAdminSessionCookie() {
  const cookieStore = await cookies();

  cookieStore.set(adminSessionCookie, createAdminSessionValue(), {
    httpOnly: true,
    maxAge: sessionMaxAgeSeconds,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearAdminSessionCookie() {
  const cookieStore = await cookies();

  cookieStore.delete(adminSessionCookie);
}
