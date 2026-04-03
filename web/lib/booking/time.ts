import { addMinutes } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export function isIsoDateString(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function isTimeString(value: string) {
  return /^\d{2}:\d{2}$/.test(value);
}

export function buildUtcDate(date: string, time: string, timezone: string) {
  return fromZonedTime(`${date}T${time}:00`, timezone);
}

export function getWeekdayForDate(date: string, timezone: string) {
  const localNoon = fromZonedTime(`${date}T12:00:00`, timezone);
  const isoWeekday = Number(formatInTimeZone(localNoon, timezone, "i"));

  return isoWeekday % 7;
}

export function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);

  return hours * 60 + minutes;
}

export function minutesToTime(totalMinutes: number) {
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const minutes = String(totalMinutes % 60).padStart(2, "0");

  return `${hours}:${minutes}`;
}

export function formatTimeLabel(date: Date, timezone: string) {
  return formatInTimeZone(date, timezone, "HH:mm");
}

export function addMinutesSafe(date: Date, minutes: number) {
  return addMinutes(date, minutes);
}

export function overlaps(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date,
) {
  return startA < endB && endA > startB;
}
