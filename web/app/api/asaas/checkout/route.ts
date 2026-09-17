import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { createMembershipCheckout, MembershipCheckoutError } from "@/lib/asaas/checkout";
import { getPublicMembershipError, membershipCheckoutError } from "@/lib/public-errors";

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
      if (error.code !== "invalid_plan") {
        console.error("membership_checkout_failed", {
          code: error.code, status: error.status, message: error.message,
        });
      }
      return NextResponse.json(
        {
          code: error.code,
          error: getPublicMembershipError(error.code),
        },
        { status: error.status },
      );
    }

    console.error("membership_checkout_failed", error instanceof Error ? error.message : "unknown_error");
    return NextResponse.json(
      {
        error: membershipCheckoutError,
      },
      { status: 500 },
    );
  }
}
