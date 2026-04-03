export type BookingService = {
  active: boolean;
  bufferAfterMinutes: number;
  bufferBeforeMinutes: number;
  description: string;
  durationMinutes: number;
  id?: string;
  name: string;
  priceLabel: string;
  slug: string;
  sortOrder: number;
};

export type BusinessHour = {
  closesAt: string;
  isClosed: boolean;
  opensAt: string;
  weekday: number;
};

export type BusyRange = {
  end: Date;
  source: "appointment" | "blocked" | "google";
  start: Date;
};

export type AvailableSlot = {
  displayEndsAt: string;
  endsAt: string;
  label: string;
  startsAt: string;
  time: string;
};

export type BookingCatalog = {
  businessHours: BusinessHour[];
  source: "fallback" | "supabase";
  timezone: string;
  services: BookingService[];
};

export type AvailabilityResult = {
  businessHours: BusinessHour[];
  date: string;
  service: BookingService;
  slots: AvailableSlot[];
  timezone: string;
};
