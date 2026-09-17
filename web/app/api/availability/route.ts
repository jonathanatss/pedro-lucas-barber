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
        error: "Escolha um serviço e uma data.",
      },
      { status: 400, headers },
    );
  }

  try {
    const availability = await getAvailabilityForDate(date, serviceSlug);

    return NextResponse.json(availability, { headers });
  } catch (error) {
    console.error("booking_availability_failed", error instanceof Error ? error.message : "unknown_error");
    return NextResponse.json(
      { error: "Não foi possível carregar os horários. Tente novamente." },
      { status: 400, headers },
    );
  }
}
