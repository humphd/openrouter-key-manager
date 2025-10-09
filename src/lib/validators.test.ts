import { describe, test, expect } from "vitest";
import {
  validateEmail,
  validateTags,
  validateDate,
  validateLimit,
  validateFormat,
} from "./validators.js";
import { ValidationError } from "../utils/errors.js";

describe("validateEmail", () => {
  test("accepts valid email", () => {
    expect(() => validateEmail("alice@example.com")).not.toThrow();
    expect(() => validateEmail("test.user@domain.co.uk")).not.toThrow();
  });

  test("rejects invalid email", () => {
    expect(() => validateEmail("not-an-email")).toThrow(ValidationError);
    expect(() => validateEmail("missing@domain")).toThrow(ValidationError);
    expect(() => validateEmail("@example.com")).toThrow(ValidationError);
  });
});

describe("validateTags", () => {
  test("accepts valid tags", () => {
    expect(() => validateTags(["CCP555", "student"])).not.toThrow();
    expect(() => validateTags(["AI-lab", "research_2025"])).not.toThrow();
    expect(() => validateTags([])).not.toThrow();
  });

  test("rejects tags with spaces", () => {
    expect(() => validateTags(["CCP 555"])).toThrow(ValidationError);
    expect(() => validateTags(["valid", "has space"])).toThrow(ValidationError);
  });

  test("rejects empty tags", () => {
    expect(() => validateTags([""])).toThrow(ValidationError);
    expect(() => validateTags(["  "])).toThrow(ValidationError);
  });
});

describe("validateDate", () => {
  test("accepts valid date", () => {
    expect(() => validateDate("2025-01-15")).not.toThrow();
    expect(() => validateDate("2024-12-31")).not.toThrow();
  });

  test("rejects invalid date format", () => {
    expect(() => validateDate("01-15-2025")).toThrow(ValidationError);
    expect(() => validateDate("2025/01/15")).toThrow(ValidationError);
    expect(() => validateDate("not-a-date")).toThrow(ValidationError);
  });

  test("rejects invalid date values", () => {
    expect(() => validateDate("2025-13-01")).toThrow(ValidationError);
    expect(() => validateDate("2025-02-30")).toThrow(ValidationError);
  });
});

describe("validateLimit", () => {
  test("accepts valid limit", () => {
    expect(validateLimit(10)).toBe(10);
    expect(validateLimit(0.5)).toBe(0.5);
    expect(validateLimit(100.99)).toBe(100.99);
  });

  test("rejects invalid limit", () => {
    expect(() => validateLimit(0)).toThrow(ValidationError);
    expect(() => validateLimit(-5)).toThrow(ValidationError);
    expect(() => validateLimit(NaN)).toThrow(ValidationError);
  });
});

describe("validateFormat", () => {
  test("accepts valid formats", () => {
    expect(validateFormat("table")).toBe("table");
    expect(validateFormat("json")).toBe("json");
    expect(validateFormat("csv")).toBe("csv");
  });

  test("rejects invalid format", () => {
    expect(() => validateFormat("xml")).toThrow(ValidationError);
    expect(() => validateFormat("html")).toThrow(ValidationError);
  });
});
