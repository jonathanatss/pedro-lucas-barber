import type { BookingCatalog, BookingService, BusinessHour } from "@/lib/booking/types";

import { fallbackCatalog } from "@/lib/booking/config";
import { bookingTimezone } from "@/lib/env";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type ServiceRow = {
  active: boolean;
  buffer_after_minutes: number;
  buffer_before_minutes: number;
  description: string;
  duration_minutes: number;
  id: string;
  name: string;
  price_label: string;
  slug: string;
  sort_order: number;
};

type BusinessHourRow = {
  closes_at: string;
  is_closed: boolean;
  opens_at: string;
  weekday: number;
};

function mapServiceRow(row: ServiceRow): BookingService {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    durationMinutes: row.duration_minutes,
    bufferBeforeMinutes: row.buffer_before_minutes,
    bufferAfterMinutes: row.buffer_after_minutes,
    priceLabel: row.price_label,
    sortOrder: row.sort_order,
    active: row.active,
  };
}

function mapBusinessHourRow(row: BusinessHourRow): BusinessHour {
  return {
    weekday: row.weekday,
    opensAt: row.opens_at,
    closesAt: row.closes_at,
    isClosed: row.is_closed,
  };
}

export async function getBookingCatalog(): Promise<BookingCatalog> {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return fallbackCatalog;
  }

  const [servicesResult, businessHoursResult] = await Promise.all([
    supabase
      .from("services")
      .select(
        "id, slug, name, description, duration_minutes, buffer_before_minutes, buffer_after_minutes, price_label, sort_order, active",
      )
      .eq("active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("business_hours")
      .select("weekday, opens_at, closes_at, is_closed")
      .order("weekday", { ascending: true }),
  ]);

  if (servicesResult.error || businessHoursResult.error) {
    return fallbackCatalog;
  }

  const services = (servicesResult.data ?? []).map((row) =>
    mapServiceRow(row as ServiceRow),
  );
  const businessHours = (businessHoursResult.data ?? []).map((row) =>
    mapBusinessHourRow(row as BusinessHourRow),
  );

  if (!services.length || !businessHours.length) {
    return fallbackCatalog;
  }

  return {
    source: "supabase",
    timezone: bookingTimezone,
    services,
    businessHours,
  };
}

export async function getServiceBySlug(slug: string) {
  const catalog = await getBookingCatalog();

  return catalog.services.find((service) => service.slug === slug) ?? null;
}
