import { NextResponse } from "next/server";

import {
  AsaasWebhookError,
  processAsaasWebhook,
  validateAsaasWebhookToken,
} from "@/lib/asaas/webhook";

export async function POST(request: Request) {
  try {
    validateAsaasWebhookToken(request.headers);

    const payload = await request.json();
    const result = await processAsaasWebhook(payload);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AsaasWebhookError) {
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
        error: "Falha inesperada ao processar webhook do Asaas.",
      },
      { status: 500 },
    );
  }
}
