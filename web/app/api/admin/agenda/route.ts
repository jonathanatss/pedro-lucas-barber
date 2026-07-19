import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { AdminAuthError, requireAdminAuthenticated } from "@/lib/admin-auth";
import { bookingTimezone } from "@/lib/env";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { buildUtcDate, isIsoDateString, isTimeString, timeToMinutes } from "@/lib/booking/time";

class AdminAgendaError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

type BusinessHourRow = {
  closes_at: string;
  is_closed: boolean;
  opens_at: string;
  weekday: number;
};

type BusinessDayOverrideRow = {
  closes_at: string;
  date: string;
  id: string;
  is_closed: boolean;
  opens_at: string;
  reason: string | null;
};

type BlockedPeriodRow = {
  ends_at: string;
  id: string;
  reason: string | null;
  starts_at: string;
};

type AppointmentRow = {
  customer_email: string | null;
  customer_name: string;
  customer_phone: string;
  ends_at: string;
  id: string;
  notes: string | null;
  service_name_snapshot: string;
  starts_at: string;
  status: string;
};

const timeSchema = z.string().refine(
  (value) => isTimeString(value) && timeToMinutes(value) < 24 * 60,
  "Use um horário no formato HH:mm.",
);

const businessHourSchema = z
  .object({
    closesAt: timeSchema,
    isClosed: z.boolean(),
    opensAt: timeSchema,
    weekday: z.number().int().min(0).max(6),
  })
  .refine(
    (value) =>
      value.isClosed || timeToMinutes(value.opensAt) < timeToMinutes(value.closesAt),
    {
      message: "O horário de abertura precisa ser menor que o fechamento.",
      path: ["closesAt"],
    },
  );

const overrideSchema = z
  .object({
    closesAt: timeSchema,
    date: z.string().refine(isIsoDateString, "Use uma data no formato YYYY-MM-DD."),
    isClosed: z.boolean(),
    opensAt: timeSchema,
    reason: z.string().trim().max(160).optional().or(z.literal("")),
  })
  .refine(
    (value) =>
      value.isClosed || timeToMinutes(value.opensAt) < timeToMinutes(value.closesAt),
    {
      message: "O horário de abertura precisa ser menor que o fechamento.",
      path: ["closesAt"],
    },
  );

const blockSchema = z
  .object({
    date: z.string().refine(isIsoDateString, "Use uma data no formato YYYY-MM-DD."),
    endsAt: timeSchema,
    reason: z.string().trim().min(2).max(160),
    startsAt: timeSchema,
  })
  .refine(
    (value) => timeToMinutes(value.startsAt) < timeToMinutes(value.endsAt),
    {
      message: "O início do bloqueio precisa ser menor que o fim.",
      path: ["endsAt"],
    },
  );

const updateBusinessHoursSchema = z.object({
  businessHours: z.array(businessHourSchema).length(7),
});

const agendaActionSchema = z.discriminatedUnion("type", [
  z.object({
    override: overrideSchema,
    type: z.literal("upsertOverride"),
  }),
  z.object({
    id: z.string().uuid(),
    type: z.literal("deleteOverride"),
  }),
  z.object({
    block: blockSchema,
    type: z.literal("createBlock"),
  }),
  z.object({
    id: z.string().uuid(),
    type: z.literal("deleteBlock"),
  }),
]);

function getTodayInTimezone(timezone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function addDaysToIsoDate(value: string, days: number) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days, 12));

  return date.toISOString().slice(0, 10);
}

async function getAdminSupabase() {
  await requireAdminAuthenticated();

  const supabase = getSupabaseAdmin();

  if (!supabase) {
    throw new AdminAgendaError(
      "As credenciais de serviço do Supabase não foram configuradas.",
      503,
    );
  }

  return supabase;
}

function mapBusinessHour(row: BusinessHourRow) {
  return {
    closesAt: row.closes_at,
    isClosed: row.is_closed,
    opensAt: row.opens_at,
    weekday: row.weekday,
  };
}

function mapOverride(row: BusinessDayOverrideRow) {
  return {
    closesAt: row.closes_at,
    date: row.date,
    id: row.id,
    isClosed: row.is_closed,
    opensAt: row.opens_at,
    reason: row.reason,
  };
}

function mapBlockedPeriod(row: BlockedPeriodRow) {
  return {
    endsAt: row.ends_at,
    id: row.id,
    reason: row.reason,
    startsAt: row.starts_at,
  };
}

function mapAppointment(row: AppointmentRow) {
  return {
    customerEmail: row.customer_email,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    endsAt: row.ends_at,
    id: row.id,
    notes: row.notes,
    serviceName: row.service_name_snapshot,
    startsAt: row.starts_at,
    status: row.status,
  };
}

async function readAgenda() {
  const supabase = await getAdminSupabase();
  const today = getTodayInTimezone(bookingTimezone);
  const rangeEndDate = addDaysToIsoDate(today, 60);
  const windowStart = buildUtcDate(today, "00:00", bookingTimezone).toISOString();
  const windowEnd = buildUtcDate(rangeEndDate, "23:59", bookingTimezone).toISOString();

  const [
    businessHoursResult,
    overridesResult,
    blockedPeriodsResult,
    appointmentsResult,
  ] = await Promise.all([
    supabase
      .from("business_hours")
      .select("weekday, opens_at, closes_at, is_closed")
      .order("weekday", { ascending: true }),
    supabase
      .from("business_day_overrides")
      .select("id, date, opens_at, closes_at, is_closed, reason")
      .gte("date", today)
      .lte("date", rangeEndDate)
      .order("date", { ascending: true }),
    supabase
      .from("blocked_periods")
      .select("id, starts_at, ends_at, reason")
      .lt("starts_at", windowEnd)
      .gt("ends_at", windowStart)
      .order("starts_at", { ascending: true }),
    supabase
      .from("appointments")
      .select(
        "id, customer_name, customer_phone, customer_email, notes, service_name_snapshot, starts_at, ends_at, status",
      )
      .in("status", ["confirmed", "pending_sync"])
      .gte("starts_at", windowStart)
      .lte("starts_at", windowEnd)
      .order("starts_at", { ascending: true }),
  ]);

  const errors = [
    businessHoursResult.error,
    overridesResult.error,
    blockedPeriodsResult.error,
    appointmentsResult.error,
  ].filter(Boolean);

  if (errors.length) {
    throw new AdminAgendaError(
      errors[0]?.message ??
        "Não foi possível carregar a agenda administrativa.",
      500,
    );
  }

  return {
    appointments: (appointmentsResult.data ?? []).map((row) =>
      mapAppointment(row as AppointmentRow),
    ),
    blockedPeriods: (blockedPeriodsResult.data ?? []).map((row) =>
      mapBlockedPeriod(row as BlockedPeriodRow),
    ),
    businessHours: (businessHoursResult.data ?? []).map((row) =>
      mapBusinessHour(row as BusinessHourRow),
    ),
    overrides: (overridesResult.data ?? []).map((row) =>
      mapOverride(row as BusinessDayOverrideRow),
    ),
    timezone: bookingTimezone,
  };
}

function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { details: error.flatten(), error: "Dados inválidos." },
      { status: 400 },
    );
  }

  if (error instanceof AdminAuthError || error instanceof AdminAgendaError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  }

  return NextResponse.json(
    { error: "Falha inesperada na agenda administrativa." },
    { status: 500 },
  );
}

export async function GET() {
  try {
    return NextResponse.json(await readAgenda());
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await getAdminSupabase();
    const body = updateBusinessHoursSchema.parse(await request.json());

    const result = await supabase.from("business_hours").upsert(
      body.businessHours.map((businessHour) => ({
        closes_at: businessHour.closesAt,
        is_closed: businessHour.isClosed,
        opens_at: businessHour.opensAt,
        updated_at: new Date().toISOString(),
        weekday: businessHour.weekday,
      })),
      { onConflict: "weekday" },
    );

    if (result.error) {
      throw new AdminAgendaError(result.error.message, 500);
    }

    return NextResponse.json(await readAgenda());
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await getAdminSupabase();
    const body = agendaActionSchema.parse(await request.json());

    if (body.type === "upsertOverride") {
      const result = await supabase.from("business_day_overrides").upsert(
        {
          closes_at: body.override.closesAt,
          date: body.override.date,
          is_closed: body.override.isClosed,
          opens_at: body.override.opensAt,
          reason: body.override.reason || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "date" },
      );

      if (result.error) {
        throw new AdminAgendaError(result.error.message, 500);
      }
    }

    if (body.type === "deleteOverride") {
      const result = await supabase
        .from("business_day_overrides")
        .delete()
        .eq("id", body.id);

      if (result.error) {
        throw new AdminAgendaError(result.error.message, 500);
      }
    }

    if (body.type === "createBlock") {
      const startsAt = buildUtcDate(
        body.block.date,
        body.block.startsAt,
        bookingTimezone,
      );
      const endsAt = buildUtcDate(
        body.block.date,
        body.block.endsAt,
        bookingTimezone,
      );

      const result = await supabase.from("blocked_periods").insert({
        ends_at: endsAt.toISOString(),
        reason: body.block.reason,
        starts_at: startsAt.toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (result.error) {
        throw new AdminAgendaError(result.error.message, 500);
      }
    }

    if (body.type === "deleteBlock") {
      const result = await supabase
        .from("blocked_periods")
        .delete()
        .eq("id", body.id);

      if (result.error) {
        throw new AdminAgendaError(result.error.message, 500);
      }
    }

    return NextResponse.json(await readAgenda());
  } catch (error) {
    return handleApiError(error);
  }
}
