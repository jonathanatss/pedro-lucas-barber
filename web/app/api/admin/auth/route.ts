import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import {
  AdminAuthError,
  clearAdminSessionCookie,
  isAdminAuthenticated,
  isAdminPasswordConfigured,
  setAdminSessionCookie,
  verifyAdminPassword,
} from "@/lib/admin-auth";

const loginSchema = z.object({
  password: z.string().min(1),
});

export async function GET() {
  return NextResponse.json({
    authenticated: await isAdminAuthenticated(),
    configured: isAdminPasswordConfigured(),
  });
}

export async function POST(request: Request) {
  try {
    const body = loginSchema.parse(await request.json());

    if (!verifyAdminPassword(body.password)) {
      return NextResponse.json(
        { error: "Senha administrativa inválida." },
        { status: 401 },
      );
    }

    await setAdminSessionCookie();

    return NextResponse.json({ authenticated: true });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Informe a senha administrativa." },
        { status: 400 },
      );
    }

    if (error instanceof AdminAuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { error: "Não foi possível iniciar a sessão administrativa." },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  await clearAdminSessionCookie();

  return NextResponse.json({ authenticated: false });
}
