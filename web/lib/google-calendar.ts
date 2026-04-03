import { google } from "googleapis";

import {
  bookingTimezone,
  env,
  getGooglePrivateKey,
  hasGoogleCalendarCredentials,
} from "@/lib/env";

type BusyRange = {
  start: Date;
  end: Date;
  source: "google";
};

type CalendarEventInput = {
  customerEmail?: string | null;
  customerName: string;
  customerPhone: string;
  description?: string | null;
  end: Date;
  serviceName: string;
  start: Date;
};

function getCalendarClient() {
  if (!hasGoogleCalendarCredentials) {
    return null;
  }

  const auth = new google.auth.JWT({
    email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL!,
    key: getGooglePrivateKey(),
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });

  return google.calendar({ version: "v3", auth });
}

export async function getGoogleBusyRanges(
  timeMin: Date,
  timeMax: Date,
): Promise<BusyRange[]> {
  const calendar = getCalendarClient();

  if (!calendar) {
    return [];
  }

  const response = await calendar.freebusy.query({
    requestBody: {
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      timeZone: bookingTimezone,
      items: [{ id: env.GOOGLE_CALENDAR_ID! }],
    },
  });

  const busy =
    response.data.calendars?.[env.GOOGLE_CALENDAR_ID!]?.busy?.flatMap((slot) => {
      if (!slot.start || !slot.end) {
        return [];
      }

      return [
        {
          start: new Date(slot.start),
          end: new Date(slot.end),
          source: "google" as const,
        },
      ];
    }) ?? [];

  return busy;
}

export async function createGoogleCalendarEvent(input: CalendarEventInput) {
  const calendar = getCalendarClient();

  if (!calendar) {
    return null;
  }

  const response = await calendar.events.insert({
    calendarId: env.GOOGLE_CALENDAR_ID!,
    requestBody: {
      summary: `Agendamento | ${input.serviceName} | ${input.customerName}`,
      description: [
        `Cliente: ${input.customerName}`,
        `Telefone: ${input.customerPhone}`,
        input.customerEmail ? `E-mail: ${input.customerEmail}` : null,
        input.description ? `Observações: ${input.description}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
      start: {
        dateTime: input.start.toISOString(),
        timeZone: bookingTimezone,
      },
      end: {
        dateTime: input.end.toISOString(),
        timeZone: bookingTimezone,
      },
    },
  });

  return response.data.id ?? null;
}
