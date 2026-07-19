import { z } from "zod";

import { createGoogleCalendarEvent } from "@/lib/google-calendar";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getAvailabilityForDate } from "@/lib/booking/availability";
import { getBookingCatalog } from "@/lib/booking/catalog";
import { addMinutesSafe, buildUtcDate, isIsoDateString, isTimeString } from "@/lib/booking/time";
import { notifyBarberOnWhatsApp } from "@/lib/booking/whatsapp-notification";
import { getMissingSupabaseServiceCredentials } from "@/lib/env";

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

function getAppointmentInsertErrorMessage(errorCode?: string) {
  if (errorCode === "42501") {
    return "Permissão negada ao criar agendamento no Supabase. Verifique se SUPABASE_SERVICE_ROLE_KEY é a chave service_role e se está disponível para Functions na Netlify.";
  }

  if (errorCode === "42P01") {
    return "A tabela appointments ainda não existe no Supabase. Rode a migration de agendamento antes de testar.";
  }

  if (errorCode === "42703" || errorCode === "PGRST204") {
    return "O schema da tabela appointments está diferente do esperado. Rode a migration de reparo do agendamento no Supabase.";
  }

  if (errorCode === "23503") {
    return "O serviço selecionado não foi encontrado no Supabase. Verifique a tabela services.";
  }

  if (errorCode === "23502") {
    return "Uma coluna obrigatoria legada ainda esta impedindo o agendamento. Verifique o schema da tabela appointments no Supabase.";
  }

  if (errorCode === "23P01" || errorCode === "23505") {
    return "Outro cliente acabou de reservar este horário. Escolha um novo horário para continuar.";
  }

  return "Não foi possível confirmar o agendamento agora. Verifique se a migration de agendamento foi executada no Supabase.";
}

export async function createAppointment(rawInput: unknown) {
  const input = appointmentInputSchema.parse(rawInput);
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    const missingCredentials = getMissingSupabaseServiceCredentials();

    throw new BookingError(
      missingCredentials.length
        ? `Credenciais do Supabase ausentes no runtime: ${missingCredentials.join(", ")}.`
        : "As credenciais do Supabase ainda não foram configuradas.",
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
    const isSlotConflict = insertResult.error.code === "23P01" || insertResult.error.code === "23505";

    console.error("appointment_insert_failed", {
      code: insertResult.error.code,
      details: insertResult.error.details,
      hint: insertResult.error.hint,
      message: insertResult.error.message,
    });

    throw new BookingError(
      getAppointmentInsertErrorMessage(insertResult.error.code),
      isSlotConflict ? 409 : 500,
      isSlotConflict ? "slot_conflict" : "insert_failed",
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

  const calendarSyncResult = await supabase
    .from("appointments")
    .update({
      google_event_id: googleEventId,
      status: syncStatus,
    })
    .eq("id", insertResult.data.id);

  if (calendarSyncResult.error) {
    console.error("appointment_calendar_status_update_failed", {
      code: calendarSyncResult.error.code,
      details: calendarSyncResult.error.details,
      hint: calendarSyncResult.error.hint,
      message: calendarSyncResult.error.message,
    });
  }

  const whatsappNotification = await notifyBarberOnWhatsApp({
    appointmentId: insertResult.data.id,
    customerEmail: input.customerEmail || null,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    end: occupiedEnd,
    googleEventId,
    notes: input.notes || null,
    serviceName: service.name,
    start: customerStart,
    syncStatus,
    timezone: catalog.timezone,
  });

  const whatsappStatusUpdateResult = await supabase
    .from("appointments")
    .update({
      barber_whatsapp_error: whatsappNotification.error ?? null,
      barber_whatsapp_message_id: whatsappNotification.messageId ?? null,
      barber_whatsapp_notified_at: whatsappNotification.sentAt ?? null,
      barber_whatsapp_provider: whatsappNotification.provider,
      barber_whatsapp_status: whatsappNotification.status,
    })
    .eq("id", insertResult.data.id);

  if (whatsappStatusUpdateResult.error) {
    console.error("appointment_whatsapp_status_update_failed", {
      code: whatsappStatusUpdateResult.error.code,
      details: whatsappStatusUpdateResult.error.details,
      hint: whatsappStatusUpdateResult.error.hint,
      message: whatsappStatusUpdateResult.error.message,
    });
  }

  return {
    appointmentId: insertResult.data.id,
    googleEventId,
    serviceName: service.name,
    start: customerStart.toISOString(),
    end: serviceEnd.toISOString(),
    syncStatus,
    timezone: catalog.timezone,
    whatsappNotificationStatus: whatsappNotification.status,
  };
}
