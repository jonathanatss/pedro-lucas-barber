import {
  createHmac,
  randomBytes,
  scrypt as nodeScrypt,
  timingSafeEqual,
} from "crypto";
import { promisify } from "util";
import { cookies } from "next/headers";

import { env, hasAdminPassword, hasSupabaseServiceCredentials } from "@/lib/env";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const adminSessionCookie = "plb_admin_session";
const sessionMaxAgeSeconds = 60 * 60 * 12;
const legacySupportId = "legacy-support";
const legacySupportUsername = "suporte";
const scrypt = promisify(nodeScrypt);

export type AdminRole = "barber" | "support";

export type AdminPrincipal = {
  displayName: string;
  id: string;
  mustChangePassword: boolean;
  role: AdminRole;
  sessionVersion: number;
  username: string;
};

type AdminUserRow = {
  display_name: string;
  id: string;
  is_active: boolean;
  must_change_password: boolean;
  password_hash: string;
  role: AdminRole;
  session_version: number;
  username: string;
};

type SessionPayload = {
  displayName: string;
  exp: number;
  mustChangePassword: boolean;
  role: AdminRole;
  sessionVersion: number;
  sub: string;
  username: string;
};

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
      "A autenticação administrativa ainda não foi configurada.",
      503,
    );
  }

  return createHmac("sha256", secret).update(value).digest("base64url");
}

function safeCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function normalizeUsername(username: string) {
  return username.trim().toLocaleLowerCase("pt-BR");
}

function mapAdminUser(row: AdminUserRow): AdminPrincipal {
  return {
    displayName: row.display_name,
    id: row.id,
    mustChangePassword: row.must_change_password,
    role: row.role,
    sessionVersion: row.session_version,
    username: row.username,
  };
}

async function findAdminUser(username: string) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return null;
  }

  const result = await supabase
    .from("admin_users")
    .select(
      "id, username, display_name, role, password_hash, is_active, must_change_password, session_version",
    )
    .eq("username", normalizeUsername(username))
    .maybeSingle();

  if (result.error) {
    if (result.error.code === "42P01" || result.error.code === "PGRST205") {
      return null;
    }

    throw new AdminAuthError(
      "Não foi possível consultar os usuários administrativos.",
      500,
    );
  }

  return (result.data as AdminUserRow | null) ?? null;
}

async function findAdminUserById(id: string) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return null;
  }

  const result = await supabase
    .from("admin_users")
    .select(
      "id, username, display_name, role, password_hash, is_active, must_change_password, session_version",
    )
    .eq("id", id)
    .maybeSingle();

  if (result.error || !result.data) {
    return null;
  }

  return result.data as AdminUserRow;
}

export function isAdminAuthConfigured() {
  return Boolean(getSessionSecret()) && (hasSupabaseServiceCredentials || hasAdminPassword);
}

export async function hashAdminPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;

  return `scrypt$${salt}$${derivedKey.toString("base64url")}`;
}

export async function verifyAdminPassword(password: string, encodedHash: string) {
  const [algorithm, salt, storedHash] = encodedHash.split("$");

  if (algorithm !== "scrypt" || !salt || !storedHash) {
    return false;
  }

  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;

  return safeCompare(derivedKey.toString("base64url"), storedHash);
}

export async function authenticateAdminUser(username: string, password: string) {
  const normalizedUsername = normalizeUsername(username);
  const user = await findAdminUser(normalizedUsername);

  if (user) {
    if (!user.is_active || !(await verifyAdminPassword(password, user.password_hash))) {
      return null;
    }

    return mapAdminUser(user);
  }

  if (
    normalizedUsername === legacySupportUsername &&
    env.ADMIN_PASSWORD &&
    safeCompare(password, env.ADMIN_PASSWORD)
  ) {
    return {
      displayName: "Suporte",
      id: legacySupportId,
      mustChangePassword: false,
      role: "support" as const,
      sessionVersion: 1,
      username: legacySupportUsername,
    };
  }

  return null;
}

export function createAdminSessionValue(principal: AdminPrincipal) {
  const payload: SessionPayload = {
    displayName: principal.displayName,
    exp: Date.now() + sessionMaxAgeSeconds * 1000,
    mustChangePassword: principal.mustChangePassword,
    role: principal.role,
    sessionVersion: principal.sessionVersion,
    sub: principal.id,
    username: principal.username,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");

  return `${encodedPayload}.${sign(encodedPayload)}`;
}

function parseAdminSessionValue(value?: string) {
  if (!value) {
    return null;
  }

  const [encodedPayload, signature] = value.split(".");

  if (!encodedPayload || !signature || !safeCompare(signature, sign(encodedPayload))) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as SessionPayload;

    if (!payload.exp || payload.exp < Date.now() || !payload.sub) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function getAdminPrincipal() {
  if (!isAdminAuthConfigured()) {
    return null;
  }

  const cookieStore = await cookies();
  const payload = parseAdminSessionValue(cookieStore.get(adminSessionCookie)?.value);

  if (!payload) {
    return null;
  }

  if (payload.sub === legacySupportId) {
    return hasAdminPassword
      ? {
          displayName: payload.displayName,
          id: payload.sub,
          mustChangePassword: payload.mustChangePassword,
          role: payload.role,
          sessionVersion: payload.sessionVersion,
          username: payload.username,
        }
      : null;
  }

  const user = await findAdminUserById(payload.sub);

  if (
    !user ||
    !user.is_active ||
    user.session_version !== payload.sessionVersion
  ) {
    return null;
  }

  return mapAdminUser(user);
}

export async function isAdminAuthenticated() {
  return Boolean(await getAdminPrincipal());
}

export async function requireAdminAuthenticated() {
  const principal = await getAdminPrincipal();

  if (!principal) {
    throw new AdminAuthError("Sessão administrativa inválida.", 401);
  }

  return principal;
}

export async function requireSupportAuthenticated() {
  const principal = await requireAdminAuthenticated();

  if (principal.role !== "support") {
    throw new AdminAuthError("Apenas o suporte pode gerenciar usuários.", 403);
  }

  return principal;
}

export async function setAdminSessionCookie(principal: AdminPrincipal) {
  const cookieStore = await cookies();

  cookieStore.set(adminSessionCookie, createAdminSessionValue(principal), {
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

export async function changeAdminPassword(
  principal: AdminPrincipal,
  currentPassword: string,
  newPassword: string,
) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    throw new AdminAuthError("O Supabase não está configurado.", 503);
  }

  const newPasswordHash = await hashAdminPassword(newPassword);

  if (principal.id === legacySupportId) {
    if (!env.ADMIN_PASSWORD || !safeCompare(currentPassword, env.ADMIN_PASSWORD)) {
      throw new AdminAuthError("A senha atual está incorreta.", 401);
    }

    const result = await supabase
      .from("admin_users")
      .insert({
        display_name: principal.displayName,
        is_active: true,
        must_change_password: false,
        password_changed_at: new Date().toISOString(),
        password_hash: newPasswordHash,
        role: "support",
        session_version: 1,
        username: legacySupportUsername,
      })
      .select(
        "id, username, display_name, role, password_hash, is_active, must_change_password, session_version",
      )
      .single();

    if (result.error) {
      throw new AdminAuthError(
        "Não foi possível salvar a nova senha do suporte.",
        500,
      );
    }

    return mapAdminUser(result.data as AdminUserRow);
  }

  const user = await findAdminUserById(principal.id);

  if (!user || !(await verifyAdminPassword(currentPassword, user.password_hash))) {
    throw new AdminAuthError("A senha atual está incorreta.", 401);
  }

  const nextSessionVersion = user.session_version + 1;
  const result = await supabase
    .from("admin_users")
    .update({
      must_change_password: false,
      password_changed_at: new Date().toISOString(),
      password_hash: newPasswordHash,
      session_version: nextSessionVersion,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id)
    .select(
      "id, username, display_name, role, password_hash, is_active, must_change_password, session_version",
    )
    .single();

  if (result.error) {
    throw new AdminAuthError("Não foi possível atualizar a senha.", 500);
  }

  return mapAdminUser(result.data as AdminUserRow);
}
