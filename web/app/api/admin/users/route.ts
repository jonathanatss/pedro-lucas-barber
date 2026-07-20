import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import {
  AdminAuthError,
  hashAdminPassword,
  requireSupportAuthenticated,
} from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const saveUserSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  password: z
    .string()
    .min(10, "A senha temporária deve ter pelo menos 10 caracteres.")
    .max(128)
    .regex(/[a-z]/, "Inclua pelo menos uma letra minúscula.")
    .regex(/[A-Z]/, "Inclua pelo menos uma letra maiúscula.")
    .regex(/\d/, "Inclua pelo menos um número."),
  username: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .regex(/^[a-zA-Z0-9._-]+$/, "Use somente letras, números, ponto, hífen ou underline."),
});

function mapUser(row: {
  created_at: string;
  display_name: string;
  id: string;
  is_active: boolean;
  must_change_password: boolean;
  role: string;
  username: string;
}) {
  return {
    createdAt: row.created_at,
    displayName: row.display_name,
    id: row.id,
    isActive: row.is_active,
    mustChangePassword: row.must_change_password,
    role: row.role,
    username: row.username,
  };
}

function handleError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 },
    );
  }

  if (error instanceof AdminAuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  return NextResponse.json(
    { error: "Não foi possível gerenciar os usuários." },
    { status: 500 },
  );
}

export async function GET() {
  try {
    await requireSupportAuthenticated();
    const supabase = getSupabaseAdmin();

    if (!supabase) {
      throw new AdminAuthError("O Supabase não está configurado.", 503);
    }

    const result = await supabase
      .from("admin_users")
      .select(
        "id, username, display_name, role, is_active, must_change_password, created_at",
      )
      .order("created_at", { ascending: true });

    if (result.error) {
      throw new AdminAuthError("Não foi possível carregar os usuários.", 500);
    }

    return NextResponse.json({ users: (result.data ?? []).map(mapUser) });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireSupportAuthenticated();
    const body = saveUserSchema.parse(await request.json());
    const supabase = getSupabaseAdmin();

    if (!supabase) {
      throw new AdminAuthError("O Supabase não está configurado.", 503);
    }

    const username = body.username.toLocaleLowerCase("pt-BR");
    const existingResult = await supabase
      .from("admin_users")
      .select("id, session_version, role")
      .eq("username", username)
      .maybeSingle();

    if (existingResult.error) {
      throw new AdminAuthError("Não foi possível consultar o usuário.", 500);
    }

    if (existingResult.data?.role === "support") {
      throw new AdminAuthError(
        "A credencial de suporte não pode ser redefinida por esta tela.",
        400,
      );
    }

    const passwordHash = await hashAdminPassword(body.password);
    const values = {
      display_name: body.displayName,
      is_active: true,
      must_change_password: true,
      password_hash: passwordHash,
      role: "barber",
      session_version: (existingResult.data?.session_version ?? 0) + 1,
      updated_at: new Date().toISOString(),
      username,
    };

    const result = existingResult.data
      ? await supabase
          .from("admin_users")
          .update(values)
          .eq("id", existingResult.data.id)
          .select(
            "id, username, display_name, role, is_active, must_change_password, created_at",
          )
          .single()
      : await supabase
          .from("admin_users")
          .insert(values)
          .select(
            "id, username, display_name, role, is_active, must_change_password, created_at",
          )
          .single();

    if (result.error) {
      throw new AdminAuthError("Não foi possível salvar o usuário.", 500);
    }

    return NextResponse.json({ user: mapUser(result.data) });
  } catch (error) {
    return handleError(error);
  }
}
