import { ValidationError } from "../utils/errors.js";

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const UTC_TIMESTAMP_REGEX =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
const DURATION_REGEX = /^\s*(\d+)\s*([a-zA-Z]+)\s*$/;

const DURATION_UNITS: Record<string, string> = {
  m: "minutes",
  min: "minutes",
  mins: "minutes",
  minute: "minutes",
  minutes: "minutes",
  h: "hours",
  hr: "hours",
  hrs: "hours",
  hour: "hours",
  hours: "hours",
  d: "days",
  day: "days",
  days: "days",
  w: "weeks",
  week: "weeks",
  weeks: "weeks",
  mo: "months",
  mon: "months",
  month: "months",
  months: "months",
  y: "years",
  yr: "years",
  yrs: "years",
  year: "years",
  years: "years",
};

function validateUtcDate(date: Date, originalValue: string): void {
  if (Number.isNaN(date.getTime())) {
    throw new ValidationError(`Invalid expiration value: ${originalValue}`);
  }
}

function formatUtcDate(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function endOfUtcDay(dateOnly: string): string {
  const [year, month, day] = dateOnly.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 23, 59, 59));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    throw new ValidationError(
      `Invalid expiration date: ${dateOnly}. Use YYYY-MM-DD`,
    );
  }

  return formatUtcDate(date);
}

function addMonths(date: Date, amount: number): Date {
  const result = new Date(date.getTime());
  const originalDay = result.getUTCDate();

  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + amount);

  const lastDayOfMonth = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();

  result.setUTCDate(Math.min(originalDay, lastDayOfMonth));
  return result;
}

function addYears(date: Date, amount: number): Date {
  const result = new Date(date.getTime());
  const originalMonth = result.getUTCMonth();
  const originalDay = result.getUTCDate();

  result.setUTCFullYear(result.getUTCFullYear() + amount);

  if (
    result.getUTCMonth() !== originalMonth ||
    result.getUTCDate() !== originalDay
  ) {
    result.setUTCDate(0);
  }

  return result;
}

export function resolveExpiresAt(
  expiresAt?: string,
  expiresIn?: string,
  now: Date = new Date(),
): string | undefined {
  if (expiresAt && expiresIn) {
    throw new ValidationError(
      "Use either expiresAt or expiresIn, but not both.",
    );
  }

  if (expiresAt) {
    if (DATE_ONLY_REGEX.test(expiresAt)) {
      return endOfUtcDay(expiresAt);
    }

    if (!UTC_TIMESTAMP_REGEX.test(expiresAt)) {
      throw new ValidationError(
        "Invalid expiresAt value. Use YYYY-MM-DD or a UTC timestamp like 2027-12-31T23:59:59Z",
      );
    }

    const date = new Date(expiresAt);
    validateUtcDate(date, expiresAt);
    return formatUtcDate(date);
  }

  if (!expiresIn) {
    return undefined;
  }

  const match = expiresIn.match(DURATION_REGEX);
  if (!match) {
    throw new ValidationError(
      'Invalid expiresIn value. Use values like "30d", "12h", or "3 months".',
    );
  }

  const amount = Number.parseInt(match[1], 10);
  const unit = DURATION_UNITS[match[2].toLowerCase()];

  if (!unit) {
    throw new ValidationError(
      "Invalid expiresIn unit. Supported units: minutes, hours, days, weeks, months, years.",
    );
  }

  const result = new Date(now.getTime());

  switch (unit) {
    case "minutes":
      result.setUTCMinutes(result.getUTCMinutes() + amount);
      break;
    case "hours":
      result.setUTCHours(result.getUTCHours() + amount);
      break;
    case "days":
      result.setUTCDate(result.getUTCDate() + amount);
      break;
    case "weeks":
      result.setUTCDate(result.getUTCDate() + amount * 7);
      break;
    case "months":
      return formatUtcDate(addMonths(result, amount));
    case "years":
      return formatUtcDate(addYears(result, amount));
  }

  return formatUtcDate(result);
}
