import { NextResponse } from "next/server";

import { getAvailabilityForDate } from "@/lib/booking/availability";

export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const serviceSlug = searchParams.get("service");

  if (!date || !serviceSlug) {
    return NextResponse.json(
      {
        error: "Parâmetros obrigatórios ausentes.",
      },
      { status: 400, headers },
    );
  }

  try {
    const availability = await getAvailabilityForDate(date, serviceSlug);

    return NextResponse.json(availability, { headers });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível carregar a disponibilidade.";

    return NextResponse.json({ error: message }, { status: 400, headers });
  }
}
