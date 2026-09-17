import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";

const loadDependency = createRequire(import.meta.url);
const timezone = "America/Sao_Paulo";

// Run the actual TypeScript modules with an isolated clock and no external writes.
function loadModule(relativePath, overrides, clock) {
  const filename = fileURLToPath(new URL(relativePath, import.meta.url));
  const source = readFileSync(filename, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
    },
  });
  class ClockDate extends Date {
    constructor(...args) {
      super(...(args.length ? args : [clock.value]));
    }

    static now() {
      return clock.value;
    }
  }
  const compiledModule = { exports: {} };
  runInNewContext(outputText, {
    module: compiledModule,
    exports: compiledModule.exports,
    Date: ClockDate,
    URL,
    console,
    require: (name) => overrides[name] ?? loadDependency(name),
  }, { filename });
  return compiledModule.exports;
}

function setup(
  now = "2026-09-16T21:20:01Z",
  beforeAvailability = () => {},
  beforeBusyLookup = () => {},
) {
  const clock = { value: Date.parse(now) };
  const time = loadModule("../lib/booking/time.ts", {}, clock);
  const service = {
    id: "service-test",
    slug: "corte-de-cabelo",
    name: "Corte de Cabelo",
    description: "Test service",
    durationMinutes: 40,
    bufferBeforeMinutes: 0,
    bufferAfterMinutes: 0,
    priceLabel: "R$ 35",
    sortOrder: 1,
    active: true,
  };
  const businessBreaks = [{ startsAt: "12:00", endsAt: "13:00" }];
  const businessHours = Array.from({ length: 7 }, (_, weekday) => ({
    weekday, opensAt: "09:00", closesAt: "19:00", isClosed: weekday === 0,
  }));
  const catalog = { timezone, source: "supabase", services: [service], businessBreaks, businessHours };
  let writes = 0;
  const supabase = {
    from() {
      return {
        data: [],
        error: null,
        select() { return this; },
        in() { return this; },
        lt() { return this; },
        gt() { return this; },
        insert() { writes += 1; return this; },
        update() { writes += 1; return this; },
        eq() { return this; },
        single() { return { data: { id: "appointment-test" }, error: null }; },
      };
    },
  };
  const overrides = {
    "@/lib/booking/customer-validation": loadModule("../lib/booking/customer-validation.ts", {}, clock),
    "@/lib/booking/time": time,
    "@/lib/booking/config": { defaultBusinessBreaks: businessBreaks, slotIntervalMinutes: 40 },
    "@/lib/booking/catalog": { getBookingCatalog: async () => catalog },
    "@/lib/booking/schedule": {
      getEffectiveBusinessHourForDate: async (date) =>
        businessHours.find((hour) => hour.weekday === time.getWeekdayForDate(date, timezone)),
    },
    "@/lib/supabase-admin": { getSupabaseAdmin: () => supabase },
    "@/lib/google-calendar": {
      getGoogleBusyRanges: async () => {
        beforeBusyLookup(clock);
        return [];
      },
      createGoogleCalendarEvent: async () => null,
    },
    "@/lib/booking/whatsapp-notification": {
      notifyBarberOnWhatsApp: async () => ({ status: "not_configured", provider: null }),
    },
    "@/lib/env": { getMissingSupabaseServiceCredentials: () => [] },
  };
  const availability = loadModule("../lib/booking/availability.ts", overrides, clock);
  overrides["@/lib/booking/availability"] = {
    getAvailabilityForDate: async (...args) => {
      const result = await availability.getAvailabilityForDate(...args);
      beforeAvailability(clock);
      return result;
    },
  };
  const appointments = loadModule("../lib/booking/create-appointment.ts", overrides, clock);
  return { clock, time, service, availability, appointments, writes: () => writes };
}

const input = (date, time) => ({
  serviceSlug: "corte-de-cabelo",
  date,
  time,
  customerName: "Test Customer",
  customerPhone: "84999990000",
  customerEmail: "booking@example.com",
});

test("18:20 is no longer available after 18:20 in the barber's timezone", async () => {
  const { availability } = setup();
  const result = await availability.getAvailabilityForDate("2026-09-16", "corte-de-cabelo");
  assert.equal(result.slots.length, 0);
});

test("only strictly future slots remain on the same day", async () => {
  const { availability } = setup("2026-09-16T20:40:00Z");
  const result = await availability.getAvailabilityForDate("2026-09-16", "corte-de-cabelo");
  assert.equal(result.slots.map((slot) => slot.time).join(","), "18:20");
});

test("past days return no slots", async () => {
  const { availability } = setup();
  const result = await availability.getAvailabilityForDate("2026-09-15", "corte-de-cabelo");
  assert.equal(result.slots.length, 0);
});

test("future days retain the 40 minute grid and lunch break", async () => {
  const { availability } = setup();
  const result = await availability.getAvailabilityForDate("2026-09-17", "corte-de-cabelo");
  assert.equal(result.slots.map((slot) => slot.time).join(","),
    "09:00,09:40,10:20,11:00,13:00,13:40,14:20,15:00,15:40,16:20,17:00,17:40,18:20");
});

test("Sunday stays closed", async () => {
  const { availability } = setup();
  const result = await availability.getAvailabilityForDate("2026-09-20", "corte-de-cabelo");
  assert.equal(result.slots.length, 0);
});

test("UTC midnight does not incorrectly remove a future local-day appointment", async () => {
  const { availability } = setup("2026-09-17T01:00:00Z");
  const result = await availability.getAvailabilityForDate("2026-09-17", "corte-de-cabelo");
  assert.equal(result.slots[0].time, "09:00");
  assert.equal(result.slots[0].startsAt, "2026-09-17T12:00:00.000Z");
});

test("a slot expiring during external lookups is not offered", async () => {
  const { availability } = setup("2026-09-16T21:19:59Z", undefined, (clock) => {
    clock.value = Date.parse("2026-09-16T21:20:00Z");
  });
  const result = await availability.getAvailabilityForDate("2026-09-16", "corte-de-cabelo");
  assert.equal(result.slots.length, 0);
});

for (const [description, now, date, time] of [
  ["already elapsed time", "2026-09-16T21:20:01Z", "2026-09-16", "18:20"],
  ["exact current instant", "2026-09-16T21:20:00Z", "2026-09-16", "18:20"],
  ["past day", "2026-09-16T21:20:01Z", "2026-09-15", "09:00"],
]) {
  test(`confirmation rejects ${description} without any database write`, async () => {
    const app = setup(now);
    await assert.rejects(app.appointments.createAppointment(input(date, time)),
      (error) => error.status === 409 && error.code === "slot_in_past");
    assert.equal(app.writes(), 0);
  });
}

test("confirmation rechecks the clock immediately before insertion", async () => {
  const app = setup("2026-09-16T21:19:59Z", (clock) => {
    clock.value = Date.parse("2026-09-16T21:20:00Z");
  });
  await assert.rejects(app.appointments.createAppointment(input("2026-09-16", "18:20")),
    (error) => error.status === 409 && error.code === "slot_in_past");
  assert.equal(app.writes(), 0);
});

test("future bookings are still accepted", async () => {
  const app = setup();
  const result = await app.appointments.createAppointment(input("2026-09-17", "09:00"));
  assert.equal(result.appointmentId, "appointment-test");
  assert.equal(result.start, "2026-09-17T12:00:00.000Z");
  assert.equal(app.writes(), 3);
});

for (const [field, value] of [
  ["customerName", ""],
  ["customerName", "   "],
  ["customerPhone", ""],
  ["customerPhone", "invalid phone"],
]) {
  test(`confirmation rejects invalid ${field}: ${JSON.stringify(value)} without writes`, async () => {
    const app = setup();
    await assert.rejects(app.appointments.createAppointment({
      ...input("2026-09-17", "09:00"), [field]: value,
    }), (error) => error.issues?.some((issue) => issue.path[0] === field));
    assert.equal(app.writes(), 0);
  });
}

test("availability responses cannot be cached", async () => {
  const clock = { value: Date.parse("2026-09-16T21:20:01Z") };
  const route = loadModule("../app/api/availability/route.ts", {
    "@/lib/booking/availability": { getAvailabilityForDate: async () => ({ slots: [] }) },
    "next/server": {
      NextResponse: {
        json: (body, options = {}) => ({ body, status: options.status ?? 200, headers: options.headers }),
      },
    },
  }, clock);
  assert.equal(route.dynamic, "force-dynamic");
  for (const url of [
    "https://booking.test/api/availability?date=2026-09-16&service=corte-de-cabelo",
    "https://booking.test/api/availability",
  ]) {
    const response = await route.GET({ url });
    assert.equal(response.headers["Cache-Control"], "private, no-store, max-age=0");
  }
});
