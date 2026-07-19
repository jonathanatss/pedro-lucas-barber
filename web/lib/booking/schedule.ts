import type { BookingCatalog, BusinessHour } from "@/lib/booking/types";

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getWeekdayForDate } from "@/lib/booking/time";

type BusinessDayOverrideRow = {
  closes_at: string;
  date: string;
  is_closed: boolean;
  opens_at: string;
};

export async function getEffectiveBusinessHourForDate(
  date: string,
  catalog: BookingCatalog,
): Promise<BusinessHour | null> {
  const weekday = getWeekdayForDate(date, catalog.timezone);
  const defaultBusinessHour =
    catalog.businessHours.find((item) => item.weekday === weekday) ?? null;
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return defaultBusinessHour;
  }

  const overrideResult = await supabase
    .from("business_day_overrides")
    .select("date, opens_at, closes_at, is_closed")
    .eq("date", date)
    .maybeSingle();

  if (overrideResult.error || !overrideResult.data) {
    return defaultBusinessHour;
  }

  const override = overrideResult.data as BusinessDayOverrideRow;

  return {
    weekday,
    opensAt: override.opens_at,
    closesAt: override.closes_at,
    isClosed: override.is_closed,
  };
}
