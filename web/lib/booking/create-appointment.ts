import { z } from "zod";

import { createGoogleCalendarEvent } from "@/lib/google-calendar";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getAvailabilityForDate } from "@/lib/booking/availability";
import { getBookingCatalog } from "@/lib/booking/catalog";
import { addMinutesSafe, buildUtcDate, isIsoDateString, isTimeString } from "@/lib/booking/time";

const appointmentInputSchema = z.object({
  customerEmail: z.string().email().optional().or(z.literal("")),
  customerName: z.string().trim().min(3).max(120),
  customerPhone: z.string().trim().min(8).max(30),
  date: z.string().refine(isIsoDateString, "Data inválida."),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  serviceSlug: z.string().trim().min(2).max(120),
  time: z.string().refine(isTimeString, "Horário inválido."),
});

export class BookingError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
  ) {
    super(message);
  }
}

export async function createAppointment(rawInput: unknown) {
  const input = appointmentInputSchema.parse(rawInput);
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    throw new BookingError(
      "As credenciais do Supabase ainda não foram configuradas.",
      503,
      "supabase_not_configured",
    );
  }

  const catalog = await getBookingCatalog();
  const availability = await getAvailabilityForDate(input.date, input.serviceSlug);
  const selectedSlot = availability.slots.find((slot) => slot.time === input.time);

  if (!selectedSlot) {
    throw new BookingError(
      "Este horário não está mais disponível. Escolha outro horário para continuar.",
      409,
      "slot_unavailable",
    );
  }

  const service = catalog.services.find((item) => item.slug === input.serviceSlug);

  if (!service) {
    throw new BookingError("Serviço inválido.", 400, "invalid_service");
  }

  const customerStart = buildUtcDate(input.date, input.time, catalog.timezone);
  const serviceEnd = addMinutesSafe(customerStart, service.durationMinutes);
  const occupiedEnd = addMinutesSafe(serviceEnd, service.bufferAfterMinutes);

  const insertResult = await supabase
    .from("appointments")
    .insert({
      customer_name: input.customerName,
      customer_phone: input.customerPhone,
      customer_email: input.customerEmail || null,
      notes: input.notes || null,
      status: "confirmed",
      service_id: service.id ?? null,
      service_name_snapshot: service.name,
      service_slug_snapshot: service.slug,
      starts_at: customerStart.toISOString(),
      ends_at: occupiedEnd.toISOString(),
      timezone: catalog.timezone,
      service_duration_minutes: service.durationMinutes,
      buffer_before_minutes: service.bufferBeforeMinutes,
      buffer_after_minutes: service.bufferAfterMinutes,
    })
    .select("id")
    .single();

  if (insertResult.error) {
    if (insertResult.error.code === "23P01" || insertResult.error.code === "23505") {
      throw new BookingError(
        "Outro cliente acabou de reservar este horário. Escolha um novo horário para continuar.",
        409,
        "slot_conflict",
      );
    }

    throw new BookingError(
      "Não foi possível confirmar o agendamento agora.",
      500,
      "insert_failed",
    );
  }

  let syncStatus: "confirmed" | "pending_sync" = "confirmed";
  let googleEventId: string | null = null;

  try {
    googleEventId = await createGoogleCalendarEvent({
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      customerEmail: input.customerEmail || null,
      description: input.notes || null,
      start: customerStart,
      end: occupiedEnd,
      serviceName: service.name,
    });
  } catch {
    syncStatus = "pending_sync";
  }

  await supabase
    .from("appointments")
    .update({
      google_event_id: googleEventId,
      status: syncStatus,
    })
    .eq("id", insertResult.data.id);

  return {
    appointmentId: insertResult.data.id,
    googleEventId,
    serviceName: service.name,
    start: customerStart.toISOString(),
    end: serviceEnd.toISOString(),
    syncStatus,
    timezone: catalog.timezone,
  };
}
