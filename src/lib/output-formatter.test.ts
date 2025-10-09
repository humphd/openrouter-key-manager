import { afterEach, beforeEach, describe, test, expect } from "vitest";
import {
  outputCreatedKeys,
  outputKeyList,
  type KeyListItem,
} from "./output-formatter.js";
import type { KeyInfo } from "../types.js";
import { mkdir, readFile, rm } from "node:fs/promises";
import { join } from "node:path";

const TEST_DIR = join(process.cwd(), "src/__tests__/fixtures/output-formatter");

describe("outputCreatedKeys", () => {
  beforeEach(async () => {
    await mkdir(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  test("outputs CSV with created keys", async () => {
    const keys: KeyInfo[] = [
      {
        email: "alice@example.com",
        tags: ["CCP555", "student"],
        issuedDate: "2025-01-15",
        keyName: "alice@example.com CCP555 student 2025-01-15",
        apiKey: "sk-or-v1-abc123",
        hash: "hash-abc123",
      },
      {
        email: "bob@example.com",
        tags: ["CCP555", "professor"],
        issuedDate: "2025-01-15",
        keyName: "bob@example.com CCP555 professor 2025-01-15",
        apiKey: "sk-or-v1-def456",
        hash: "hash-def456",
      },
    ];

    const outputPath = join(TEST_DIR, "created-keys.csv");
    await outputCreatedKeys(keys, outputPath);

    const content = await readFile(outputPath, "utf-8");

    expect(content).toMatchInlineSnapshot(`
      "name,key,hash
      alice@example.com CCP555 student 2025-01-15,sk-or-v1-abc123,hash-abc123
      bob@example.com CCP555 professor 2025-01-15,sk-or-v1-def456,hash-def456"
    `);
  });

  test("escapes CSV special characters", async () => {
    const keys: KeyInfo[] = [
      {
        email: "test@example.com",
        tags: [],
        issuedDate: "2025-01-15",
        keyName: 'test with "quotes" and, commas',
        apiKey: "sk-or-v1-test",
        hash: "hash-test",
      },
    ];

    const outputPath = join(TEST_DIR, "escaped-keys.csv");
    await outputCreatedKeys(keys, outputPath);

    const content = await readFile(outputPath, "utf-8");

    expect(content).toContain('"test with ""quotes"" and, commas"');
  });
});

describe("outputKeyList", () => {
  beforeEach(async () => {
    await mkdir(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  test("outputs table format to console", async () => {
    const keys: KeyListItem[] = [
      {
        name: "alice@example.com CCP555 student 2025-01-15",
        hash: "hash-abc123",
        disabled: false,
        remaining: 8.5,
      },
      {
        name: "bob@example.com CCP555 professor 2025-01-15",
        hash: "hash-def456",
        disabled: true,
        remaining: 15.0,
      },
    ];

    // Table format outputs to console, so we just verify it doesn't throw
    await expect(outputKeyList(keys, "table")).resolves.toBeUndefined();
  });

  test("outputs JSON format", async () => {
    const keys: KeyListItem[] = [
      {
        name: "alice@example.com",
        hash: "hash-abc",
        disabled: false,
        remaining: 8.5,
      },
    ];

    const outputPath = join(TEST_DIR, "keys.json");
    await outputKeyList(keys, "json", outputPath);

    const content = await readFile(outputPath, "utf-8");
    const parsed = JSON.parse(content);

    expect(parsed).toEqual(keys);
  });

  test("outputs CSV format", async () => {
    const keys: KeyListItem[] = [
      {
        name: "alice@example.com",
        hash: "hash-abc",
        disabled: false,
        remaining: 8.5,
      },
      {
        name: "bob@example.com",
        hash: "hash-def",
        disabled: true,
        remaining: null,
      },
    ];

    const outputPath = join(TEST_DIR, "keys.csv");
    await outputKeyList(keys, "csv", outputPath);

    const content = await readFile(outputPath, "utf-8");

    expect(content).toMatchInlineSnapshot(`
      "name,hash,remaining,disabled
      alice@example.com,hash-abc,8.5,false
      bob@example.com,hash-def,,true"
    `);
  });

  test("handles null remaining values", async () => {
    const keys: KeyListItem[] = [
      {
        name: "test@example.com",
        hash: "hash-test",
        remaining: null,
      },
    ];

    const outputPath = join(TEST_DIR, "null-remaining.csv");
    await outputKeyList(keys, "csv", outputPath);

    const content = await readFile(outputPath, "utf-8");

    expect(content).toContain("test@example.com,hash-test,,");
  });
});
