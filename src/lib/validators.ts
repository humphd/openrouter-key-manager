import { ValidationError } from "../utils/errors.js";
import type { OutputFormat } from "../types.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function validateEmail(email: string): void {
  if (!EMAIL_REGEX.test(email)) {
    throw new ValidationError(`Invalid email format: ${email}`);
  }
}

export function validateTags(tags: string[]): void {
  // Tags are optional, so empty array is valid
  for (const tag of tags) {
    if (!tag || tag.trim().length === 0) {
      throw new ValidationError("Tags cannot be empty");
    }
    if (tag.includes(" ")) {
      throw new ValidationError(
        `Tag cannot contain spaces: "${tag}". Use hyphens or underscores.`
      );
    }
  }
}

export function validateDate(date: string): void {
  if (!DATE_REGEX.test(date)) {
    throw new ValidationError(`Invalid date format: ${date}. Use YYYY-MM-DD`);
  }

  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) {
    throw new ValidationError(`Invalid date: ${date}`);
  }
}

export function validateLimit(limit: number): number {
  if (isNaN(limit) || limit <= 0) {
    throw new ValidationError("Limit must be a positive number");
  }
  return limit;
}

export function validateFormat(format: string): OutputFormat {
  const validFormats: OutputFormat[] = ["table", "json", "csv"];
  if (!validFormats.includes(format as OutputFormat)) {
    throw new ValidationError(
      `Format must be one of: ${validFormats.join(", ")}`
    );
  }
  return format as OutputFormat;
}
