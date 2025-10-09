import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { parseAccountList, parseKeyFile } from "./file-parser.js";
import { writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";

const TEST_DIR = join(process.cwd(), "src/__tests__/fixtures/file-parser");

describe("parseAccountList", () => {
  beforeEach(async () => {
    await mkdir(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  test("parses CSV with email and tags", async () => {
    const csvPath = join(TEST_DIR, "accounts.csv");
    const csvContent = `email,tag1,tag2
alice@example.com,CCP555,student
bob@example.com,CCP555,professor
carol@example.com,research,AI-lab`;

    await writeFile(csvPath, csvContent);

    const result = await parseAccountList(csvPath);

    expect(result).toEqual([
      { email: "alice@example.com", tags: ["CCP555", "student"] },
      { email: "bob@example.com", tags: ["CCP555", "professor"] },
      { email: "carol@example.com", tags: ["research", "AI-lab"] },
    ]);
  });

  test("parses CSV with email only", async () => {
    const csvPath = join(TEST_DIR, "emails-only.csv");
    const csvContent = `email
alice@example.com
bob@example.com`;

    await writeFile(csvPath, csvContent);

    const result = await parseAccountList(csvPath);

    expect(result).toEqual([
      { email: "alice@example.com", tags: [] },
      { email: "bob@example.com", tags: [] },
    ]);
  });

  test("parses TSV file", async () => {
    const tsvPath = join(TEST_DIR, "accounts.tsv");
    const tsvContent = `email\ttag1\ttag2
alice@example.com\tCCP555\tstudent`;

    await writeFile(tsvPath, tsvContent);

    const result = await parseAccountList(tsvPath);

    expect(result).toEqual([
      { email: "alice@example.com", tags: ["CCP555", "student"] },
    ]);
  });

  test("handles empty tag columns", async () => {
    const csvPath = join(TEST_DIR, "empty-tags.csv");
    const csvContent = `email,tag1,tag2
alice@example.com,CCP555,
bob@example.com,,student`;

    await writeFile(csvPath, csvContent);

    const result = await parseAccountList(csvPath);

    expect(result).toEqual([
      { email: "alice@example.com", tags: ["CCP555"] },
      { email: "bob@example.com", tags: ["student"] },
    ]);
  });

  test("skips header by default", async () => {
    const csvPath = join(TEST_DIR, "with-header.csv");
    const csvContent = `email,course
alice@example.com,CCP555`;

    await writeFile(csvPath, csvContent);

    const result = await parseAccountList(csvPath, undefined, true);

    expect(result).toHaveLength(1);
    expect(result[0].email).toBe("alice@example.com");
  });

  test("does not skip header when specified", async () => {
    const csvPath = join(TEST_DIR, "no-header.csv");
    const csvContent = `alice@example.com,CCP555
bob@example.com,research`;

    await writeFile(csvPath, csvContent);

    const result = await parseAccountList(csvPath, undefined, false);

    expect(result).toHaveLength(2);
    expect(result[0].email).toBe("alice@example.com");
  });
});

describe("parseKeyFile", () => {
  beforeEach(async () => {
    await mkdir(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  test("parses CSV with name and hash", async () => {
    const csvPath = join(TEST_DIR, "keys.csv");
    const csvContent = `name,key,hash
alice@example.com CCP555 2025-01-15,sk-or-v1-abc,hash-abc
bob@example.com CCP555 2025-01-15,sk-or-v1-def,hash-def`;

    await writeFile(csvPath, csvContent);

    const result = await parseKeyFile(csvPath);

    expect(result).toEqual([
      {
        name: "alice@example.com CCP555 2025-01-15",
        hash: "hash-abc",
      },
      {
        name: "bob@example.com CCP555 2025-01-15",
        hash: "hash-def",
      },
    ]);
  });

  test("parses minimal CSV with just name and hash", async () => {
    const csvPath = join(TEST_DIR, "keys-minimal.csv");
    const csvContent = `name,hash
alice@example.com,hash-abc
bob@example.com,hash-def`;

    await writeFile(csvPath, csvContent);

    const result = await parseKeyFile(csvPath);

    expect(result).toEqual([
      { name: "alice@example.com", hash: "hash-abc" },
      { name: "bob@example.com", hash: "hash-def" },
    ]);
  });

  test("parses JSON file", async () => {
    const jsonPath = join(TEST_DIR, "keys.json");
    const jsonContent = JSON.stringify([
      { name: "alice@example.com", hash: "hash-abc" },
      { name: "bob@example.com", hash: "hash-def" },
    ]);

    await writeFile(jsonPath, jsonContent);

    const result = await parseKeyFile(jsonPath);

    expect(result).toEqual([
      { name: "alice@example.com", hash: "hash-abc" },
      { name: "bob@example.com", hash: "hash-def" },
    ]);
  });

  test("parses JSON with keyName field", async () => {
    const jsonPath = join(TEST_DIR, "keys-keyname.json");
    const jsonContent = JSON.stringify([
      { keyName: "alice@example.com", hash: "hash-abc" },
    ]);

    await writeFile(jsonPath, jsonContent);

    const result = await parseKeyFile(jsonPath);

    expect(result).toEqual([{ name: "alice@example.com", hash: "hash-abc" }]);
  });
});
