import { describe, test, expect } from "vitest";
import {
  generateKeyName,
  parseKeyName,
  generateOutputFilename,
} from "./key-formatter.js";

describe("generateKeyName", () => {
  test("generates key name with email, tags, and date", () => {
    const result = generateKeyName(
      "alice@example.com",
      ["CCP555", "student"],
      "2025-01-15"
    );

    expect(result).toBe("alice@example.com CCP555 student 2025-01-15");
  });

  test("generates key name with email and date only", () => {
    const result = generateKeyName("alice@example.com", [], "2025-01-15");

    expect(result).toBe("alice@example.com 2025-01-15");
  });

  test("replaces spaces in tags with underscores", () => {
    const result = generateKeyName(
      "alice@example.com",
      ["CCP 555", "AI lab"],
      "2025-01-15"
    );

    expect(result).toBe("alice@example.com CCP_555 AI_lab 2025-01-15");
  });

  test("trims whitespace from tags", () => {
    const result = generateKeyName(
      "alice@example.com",
      ["  CCP555  ", " student "],
      "2025-01-15"
    );

    expect(result).toBe("alice@example.com CCP555 student 2025-01-15");
  });
});

describe("parseKeyName", () => {
  test("parses key name with email, tags, and date", () => {
    const result = parseKeyName("alice@example.com CCP555 student 2025-01-15");

    expect(result).toEqual({
      email: "alice@example.com",
      tags: ["CCP555", "student"],
      date: "2025-01-15",
    });
  });

  test("parses key name with email and date only", () => {
    const result = parseKeyName("alice@example.com 2025-01-15");

    expect(result).toEqual({
      email: "alice@example.com",
      tags: [],
      date: "2025-01-15",
    });
  });

  test("returns null for invalid format (too few parts)", () => {
    const result = parseKeyName("alice@example.com");

    expect(result).toBeNull();
  });

  test("returns null for invalid date format", () => {
    const result = parseKeyName("alice@example.com CCP555 01-15-2025");

    expect(result).toBeNull();
  });

  test("handles tags with underscores", () => {
    const result = parseKeyName("alice@example.com AI_lab 2025-01-15");

    expect(result).toEqual({
      email: "alice@example.com",
      tags: ["AI_lab"],
      date: "2025-01-15",
    });
  });
});

describe("generateOutputFilename", () => {
  test("generates filename for single key with email", () => {
    const result = generateOutputFilename(
      "alice@example.com",
      [],
      "2025-01-15"
    );

    expect(result).toBe("alice-example.com-2025-01-15.csv");
  });

  test("generates filename for multiple keys with tags", () => {
    const result = generateOutputFilename(
      null,
      ["CCP555", "student", "section-A"],
      "2025-01-15"
    );

    expect(result).toBe("CCP555-student-section-A-2025-01-15.csv");
  });

  test("limits tags to first 3", () => {
    const result = generateOutputFilename(
      null,
      ["CCP555", "student", "section-A", "extra", "more"],
      "2025-01-15"
    );

    expect(result).toBe("CCP555-student-section-A-2025-01-15.csv");
  });

  test("handles email with @ replacement", () => {
    const result = generateOutputFilename("test@example.com", [], "2025-01-15");

    expect(result).toBe("test-example.com-2025-01-15.csv");
  });
});
