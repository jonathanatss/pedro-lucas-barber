import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { BookingError, createAppointment } from "@/lib/booking/create-appointment";

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
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
        },
        { status: error.status },
      );
    }

    return NextResponse.json(
      {
        error: "Falha inesperada ao criar o agendamento.",
      },
      { status: 500 },
    );
  }
}
