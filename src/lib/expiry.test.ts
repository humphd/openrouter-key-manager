import { describe, test, expect } from "vitest";
import { resolveExpiresAt } from "./expiry.js";
import { ValidationError } from "../utils/errors.js";

describe("resolveExpiresAt", () => {
  test("returns undefined when no expiration is provided", () => {
    expect(resolveExpiresAt()).toBeUndefined();
  });

  test("normalizes date-only expiresAt to end of UTC day", () => {
    expect(resolveExpiresAt("2027-12-31")).toBe("2027-12-31T23:59:59Z");
  });

  test("accepts UTC timestamp expiresAt", () => {
    expect(resolveExpiresAt("2027-12-31T23:59:59Z")).toBe(
      "2027-12-31T23:59:59Z",
    );
  });

  test("rejects non-UTC expiresAt timestamps", () => {
    expect(() => resolveExpiresAt("2027-12-31T18:59:59-05:00")).toThrow(
      ValidationError,
    );
  });

  test("resolves relative day durations", () => {
    const now = new Date("2026-01-15T12:00:00Z");
    expect(resolveExpiresAt(undefined, "30d", now)).toBe(
      "2026-02-14T12:00:00Z",
    );
  });

  test("resolves relative month durations", () => {
    const now = new Date("2026-01-31T12:00:00Z");
    expect(resolveExpiresAt(undefined, "1 month", now)).toBe(
      "2026-02-28T12:00:00Z",
    );
  });

  test("resolves relative year durations", () => {
    const now = new Date("2024-02-29T12:00:00Z");
    expect(resolveExpiresAt(undefined, "1 year", now)).toBe(
      "2025-02-28T12:00:00Z",
    );
  });

  test("rejects using both expiresAt and expiresIn", () => {
    expect(() => resolveExpiresAt("2027-12-31", "30d")).toThrow(
      ValidationError,
    );
  });

  test("rejects invalid expiresIn values", () => {
    expect(() => resolveExpiresAt(undefined, "soon")).toThrow(ValidationError);
  });
});
