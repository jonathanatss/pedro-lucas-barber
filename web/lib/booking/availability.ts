import type { AvailabilityResult, BusyRange } from "@/lib/booking/types";

import { getGoogleBusyRanges } from "@/lib/google-calendar";
import { slotIntervalMinutes } from "@/lib/booking/config";
import { getBookingCatalog } from "@/lib/booking/catalog";
import {
  addMinutesSafe,
  buildUtcDate,
  formatTimeLabel,
  getWeekdayForDate,
  isIsoDateString,
  minutesToTime,
  overlaps,
  timeToMinutes,
} from "@/lib/booking/time";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type AppointmentRow = {
  buffer_before_minutes: number;
  ends_at: string;
  starts_at: string;
};

type BlockedPeriodRow = {
  ends_at: string;
  starts_at: string;
};

async function getBusyRangesFromSupabase(
  windowStart: Date,
  windowEnd: Date,
): Promise<BusyRange[]> {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return [];
  }

  const [appointmentsResult, blockedPeriodsResult] = await Promise.all([
    supabase
      .from("appointments")
      .select("starts_at, ends_at, buffer_before_minutes")
      .in("status", ["confirmed", "pending_sync"])
      .lt("starts_at", windowEnd.toISOString())
      .gt("ends_at", windowStart.toISOString()),
    supabase
      .from("blocked_periods")
      .select("starts_at, ends_at")
      .lt("starts_at", windowEnd.toISOString())
      .gt("ends_at", windowStart.toISOString()),
  ]);

  const appointmentRanges =
    appointmentsResult.data?.map((row) => {
      const appointment = row as AppointmentRow;
      const start = addMinutesSafe(
        new Date(appointment.starts_at),
        -(appointment.buffer_before_minutes ?? 0),
      );

      return {
        start,
        end: new Date(appointment.ends_at),
        source: "appointment" as const,
      };
    }) ?? [];

  const blockedRanges =
    blockedPeriodsResult.data?.map((row) => {
      const block = row as BlockedPeriodRow;

      return {
        start: new Date(block.starts_at),
        end: new Date(block.ends_at),
        source: "blocked" as const,
      };
    }) ?? [];

  return [...appointmentRanges, ...blockedRanges];
}

export async function getAvailabilityForDate(
  date: string,
  serviceSlug: string,
): Promise<AvailabilityResult> {
  if (!isIsoDateString(date)) {
    throw new Error("Data inválida. Use o formato YYYY-MM-DD.");
  }

  const catalog = await getBookingCatalog();
  const service = catalog.services.find((item) => item.slug === serviceSlug);

  if (!service) {
    throw new Error("Serviço não encontrado.");
  }

  const weekday = getWeekdayForDate(date, catalog.timezone);
  const businessHour = catalog.businessHours.find((item) => item.weekday === weekday);

  if (!businessHour || businessHour.isClosed) {
    return {
      date,
      timezone: catalog.timezone,
      businessHours: catalog.businessHours,
      service,
      slots: [],
    };
  }

  const businessOpen = buildUtcDate(date, businessHour.opensAt, catalog.timezone);
  const businessClose = buildUtcDate(date, businessHour.closesAt, catalog.timezone);

  const busyRanges = [
    ...(await getBusyRangesFromSupabase(businessOpen, businessClose)),
    ...(await getGoogleBusyRanges(businessOpen, businessClose)),
  ];

  const startMinutes = timeToMinutes(businessHour.opensAt);
  const endMinutes = timeToMinutes(businessHour.closesAt);
  const slots = [];

  for (
    let cursor = startMinutes;
    cursor < endMinutes;
    cursor += slotIntervalMinutes
  ) {
    const time = minutesToTime(cursor);
    const customerStart = buildUtcDate(date, time, catalog.timezone);
    const occupiedStart = addMinutesSafe(
      customerStart,
      -service.bufferBeforeMinutes,
    );
    const serviceEnd = addMinutesSafe(customerStart, service.durationMinutes);
    const occupiedEnd = addMinutesSafe(serviceEnd, service.bufferAfterMinutes);

    if (occupiedStart < businessOpen || occupiedEnd > businessClose) {
      continue;
    }

    const collides = busyRanges.some((busyRange) =>
      overlaps(occupiedStart, occupiedEnd, busyRange.start, busyRange.end),
    );

    if (collides) {
      continue;
    }

    slots.push({
      time,
      label: formatTimeLabel(customerStart, catalog.timezone),
      startsAt: customerStart.toISOString(),
      displayEndsAt: serviceEnd.toISOString(),
      endsAt: occupiedEnd.toISOString(),
    });
  }

  return {
    date,
    timezone: catalog.timezone,
    businessHours: catalog.businessHours,
    service,
    slots,
  };
}
