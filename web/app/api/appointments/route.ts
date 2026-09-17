import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { BookingError, createAppointment } from "@/lib/booking/create-appointment";
import { bookingConfirmationError, getPublicBookingError } from "@/lib/public-errors";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await createAppointment(body);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Dados inválidos no formulário.",
          details: error.flatten(),
        },
        { status: 400 },
      );
    }

    if (error instanceof BookingError) {
      if (error.status >= 500) {
        console.error("booking_confirmation_failed", {
          code: error.code, status: error.status, message: error.message,
        });
      }
      return NextResponse.json(
        {
          error: getPublicBookingError(error.code),
          code: error.code,
        },
        { status: error.status },
      );
    }

    console.error("booking_confirmation_failed", error instanceof Error ? error.message : "unknown_error");
    return NextResponse.json(
      {
        error: bookingConfirmationError,
      },
      { status: 500 },
    );
  }
}
