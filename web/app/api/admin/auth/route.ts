import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import {
  AdminAuthError,
  authenticateAdminUser,
  changeAdminPassword,
  clearAdminSessionCookie,
  getAdminPrincipal,
  isAdminAuthConfigured,
  requireAdminAuthenticated,
  setAdminSessionCookie,
} from "@/lib/admin-auth";

const loginSchema = z.object({
  password: z.string().min(1).max(128),
  username: z.string().trim().min(2).max(40),
});

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(128),
    newPassword: z
      .string()
      .min(10, "A nova senha deve ter pelo menos 10 caracteres.")
      .max(128)
      .regex(/[a-z]/, "Inclua pelo menos uma letra minúscula.")
      .regex(/[A-Z]/, "Inclua pelo menos uma letra maiúscula.")
      .regex(/\d/, "Inclua pelo menos um número."),
  })
  .refine((body) => body.currentPassword !== body.newPassword, {
    message: "A nova senha deve ser diferente da senha atual.",
    path: ["newPassword"],
  });

function handleAuthError(error: unknown, fallbackMessage: string) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 },
    );
  }

  if (error instanceof AdminAuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}

export async function GET() {
  const user = await getAdminPrincipal();

  return NextResponse.json({
    authenticated: Boolean(user),
    configured: isAdminAuthConfigured(),
    user,
  });
}

export async function POST(request: Request) {
  try {
    const body = loginSchema.parse(await request.json());
    const user = await authenticateAdminUser(body.username, body.password);

    if (!user) {
      return NextResponse.json(
        { error: "Usuário ou senha inválidos." },
        { status: 401 },
      );
    }

    await setAdminSessionCookie(user);

    return NextResponse.json({ authenticated: true, user });
  } catch (error) {
    return handleAuthError(error, "Não foi possível iniciar a sessão administrativa.");
  }
}

export async function PATCH(request: Request) {
  try {
    const principal = await requireAdminAuthenticated();
    const body = changePasswordSchema.parse(await request.json());
    const user = await changeAdminPassword(
      principal,
      body.currentPassword,
      body.newPassword,
    );

    await setAdminSessionCookie(user);

    return NextResponse.json({ authenticated: true, user });
  } catch (error) {
    return handleAuthError(error, "Não foi possível alterar a senha.");
  }
}

export async function DELETE() {
  await clearAdminSessionCookie();

  return NextResponse.json({ authenticated: false });
}
