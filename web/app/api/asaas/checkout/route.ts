import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { createMembershipCheckout, MembershipCheckoutError } from "@/lib/asaas/checkout";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await createMembershipCheckout(body);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Dados inválidos para iniciar a assinatura.",
          details: error.flatten(),
        },
        { status: 400 },
      );
    }

    if (error instanceof MembershipCheckoutError) {
      return NextResponse.json(
        {
          code: error.code,
          error: error.message,
        },
        { status: error.status },
      );
    }

    return NextResponse.json(
      {
        error: "Falha inesperada ao criar o checkout recorrente.",
      },
      { status: 500 },
    );
  }
}
