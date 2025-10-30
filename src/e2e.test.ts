// test/e2e.test.ts
import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import { execSync } from "node:child_process";
import { writeFileSync, readFileSync, unlinkSync, existsSync } from "node:fs";
import { parse } from "csv-parse/sync";
import { config } from "dotenv";

const CLI = "./dist/bin/cli.js";
const TEST_LIMIT = 5.0;

const testFiles = [
  "test-accounts.csv",
  "test-keys.csv",
  "test-output.csv",
  "test-output.json",
  "test-report.html",
];

// Load in the .env, which should have OPENROUTER_PROVISIONING_KEY defined
config({ quiet: true });

function run(command: string, expectError = false): string {
  const env = {
    ...process.env,
    OPENROUTER_PROVISIONING_KEY: process.env.OPENROUTER_PROVISIONING_KEY,
  };

  if (!env.OPENROUTER_PROVISIONING_KEY) {
    throw new Error("OPENROUTER_PROVISIONING_KEY not found in environment");
  }

  try {
    // Redirect stderr to stdout so we capture both
    const result = execSync(`node ${CLI} ${command} 2>&1`, {
      encoding: "utf-8",
      env,
    });

    if (expectError) {
      throw new Error("Expected command to fail but it succeeded");
    }

    return result;
  } catch (err: any) {
    if (!expectError) {
      throw err;
    }

    const output = err.stdout || "";
    return output;
  }
}

function parseCSV(csvContent: string): Record<string, string>[] {
  return parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
}

function cleanup() {
  for (const file of testFiles) {
    if (existsSync(file)) {
      unlinkSync(file);
    }
  }
}

function createTestKey(
  email: string,
  tags: string[] = ["e2e-test"],
): {
  name: string;
  hash: string;
  email: string;
} {
  run(
    `create -e ${email} -l ${TEST_LIMIT} -t ${tags.join(" ")} -o test-output.csv`,
  );

  const csv = readFileSync("test-output.csv", "utf-8");
  const records = parseCSV(csv);

  return {
    name: records[0].name,
    hash: records[0].hash,
    email, // Just return the email we passed in
  };
}

function deleteTestKey(hash: string) {
  try {
    run(`delete --hash ${hash} -y`);
  } catch {
    // Ignore errors during cleanup
  }
}

describe("E2E CLI Tests", () => {
  beforeAll(() => {
    if (!process.env.OPENROUTER_PROVISIONING_KEY) {
      throw new Error(
        "OPENROUTER_PROVISIONING_KEY environment variable not set",
      );
    }

    if (!existsSync(CLI)) {
      throw new Error(`CLI not found at ${CLI}. Run 'pnpm build' first.`);
    }
  });

  beforeEach(() => {
    cleanup();
  });

  afterEach(() => {
    cleanup();
  });

  describe("create", () => {
    it("should create a single key", () => {
      const email = "e2e-create-test@example.com";
      const tags = ["e2e-test", "create"];

      const key = createTestKey(email, tags);

      expect(key.name).toBeDefined();
      expect(key.hash).toBeDefined();
      expect(key.email).toBe(email);

      // Cleanup
      deleteTestKey(key.hash);
    });
  });

  describe("list", () => {
    it("should list keys in table format", () => {
      const email = "e2e-list-test@example.com";
      const key = createTestKey(email);

      const output = run("list");
      expect(output).toContain(email);

      deleteTestKey(key.hash);
    });

    it("should filter by pattern", () => {
      const email = "e2e-pattern-test@example.com";
      const tags = ["e2e-pattern-unique"];
      const key = createTestKey(email, tags);

      const output = run(`list -p "*${tags[0]}*"`);
      expect(output).toContain(email);

      deleteTestKey(key.hash);
    });

    it("should output JSON format", () => {
      const email = "e2e-json-test@example.com";
      const key = createTestKey(email);

      run("list --format json -o test-output.json");
      expect(existsSync("test-output.json")).toBe(true);

      const json = JSON.parse(readFileSync("test-output.json", "utf-8"));
      expect(Array.isArray(json)).toBe(true);
      expect(json.length).toBeGreaterThan(0);

      deleteTestKey(key.hash);
    });

    it("should output CSV format", () => {
      const email = "e2e-csv-test@example.com";
      const key = createTestKey(email);

      run("list --format csv -o test-output.csv");
      expect(existsSync("test-output.csv")).toBe(true);

      const csv = readFileSync("test-output.csv", "utf-8");
      const records = parseCSV(csv);
      expect(records.length).toBeGreaterThan(0);

      deleteTestKey(key.hash);
    });
  });

  describe("set-limit", () => {
    it("should update limit by hash", () => {
      const email = "e2e-setlimit-test@example.com";
      const key = createTestKey(email);

      const newLimit = 10.0;
      run(`set-limit --hash ${key.hash} -l ${newLimit} -y`);

      // Verify the limit was updated
      run("list --format json -o test-output.json");
      const json = JSON.parse(readFileSync("test-output.json", "utf-8"));
      const updatedKey = json.find((k: any) => k.hash === key.hash);

      expect(updatedKey).toBeDefined();

      deleteTestKey(key.hash);
    });

    it("should update limit by pattern", () => {
      const email = "e2e-setlimit-pattern@example.com";
      const tags = ["e2e-setlimit-unique"];
      const key = createTestKey(email, tags);

      const newLimit = 12.0;
      run(`set-limit -p "*${tags[0]}*" -l ${newLimit} -y`);

      // Verify the limit was updated
      run("list --format json -o test-output.json");
      const json = JSON.parse(readFileSync("test-output.json", "utf-8"));
      const updatedKey = json.find((k: any) => k.hash === key.hash);

      expect(updatedKey).toBeDefined();

      deleteTestKey(key.hash);
    });
  });

  describe("disable/enable", () => {
    it("should disable a key by hash", () => {
      const email = "e2e-disable-test@example.com";
      const key = createTestKey(email);

      run(`disable --hash ${key.hash} -y`);

      // Verify it's disabled
      run("list --include-disabled --format json -o test-output.json");
      const json = JSON.parse(readFileSync("test-output.json", "utf-8"));
      const disabledKey = json.find((k: any) => k.hash === key.hash);

      expect(disabledKey).toBeDefined();
      expect(disabledKey.disabled).toBe(true);

      deleteTestKey(key.hash);
    });

    it("should enable a disabled key by hash", () => {
      const email = "e2e-enable-test@example.com";
      const key = createTestKey(email);

      // First disable it
      run(`disable --hash ${key.hash} -y`);

      // Then enable it
      run(`enable --hash ${key.hash} -y`);

      // Verify it's enabled
      run("list --format json -o test-output.json");
      const json = JSON.parse(readFileSync("test-output.json", "utf-8"));
      const enabledKey = json.find((k: any) => k.hash === key.hash);

      expect(enabledKey).toBeDefined();
      expect(enabledKey.disabled).toBe(false);

      deleteTestKey(key.hash);
    });
  });

  describe("report", () => {
    it("should generate HTML report", () => {
      const email = "e2e-report-test@example.com";
      const tags = ["e2e-report-unique"];
      const key = createTestKey(email, tags);

      run(`report -p "*${tags[0]}*" -o test-report.html`);

      expect(existsSync("test-report.html")).toBe(true);

      const html = readFileSync("test-report.html", "utf-8");
      expect(html).toContain("OpenRouter API Key Usage Report");
      expect(html).toContain(email);

      deleteTestKey(key.hash);
    });
  });

  describe("bulk-create", () => {
    it("should create multiple keys from CSV", () => {
      const csvContent = `email,tags
e2e-bulk-1@example.com,"e2e-bulk-test"
e2e-bulk-2@example.com,"e2e-bulk-test"
e2e-bulk-3@example.com,"e2e-bulk-test"`;

      writeFileSync("test-accounts.csv", csvContent);

      run(`bulk-create test-accounts.csv -l ${TEST_LIMIT} -o test-output.csv`);

      expect(existsSync("test-output.csv")).toBe(true);

      const csv = readFileSync("test-output.csv", "utf-8");
      const records = parseCSV(csv);

      expect(records).toHaveLength(3);

      // Extract email from the name field (first part before space)
      expect(records[0].name.split(" ")[0]).toBe("e2e-bulk-1@example.com");
      expect(records[1].name.split(" ")[0]).toBe("e2e-bulk-2@example.com");
      expect(records[2].name.split(" ")[0]).toBe("e2e-bulk-3@example.com");

      // Cleanup
      for (const record of records) {
        deleteTestKey(record.hash);
      }
    });
  });

  describe("rotate", () => {
    it("should rotate a key by hash", () => {
      const email = "e2e-rotate-test@example.com";
      const key = createTestKey(email);
      const oldHash = key.hash;

      run(`rotate --hash ${oldHash} -y -o test-output.csv`);

      expect(existsSync("test-output.csv")).toBe(true);

      const csv = readFileSync("test-output.csv", "utf-8");
      const records = parseCSV(csv);

      expect(records).toHaveLength(1);
      expect(records[0].hash).not.toBe(oldHash);
      expect(records[0].name).toBe(key.name);

      // Cleanup (use new hash)
      deleteTestKey(records[0].hash);
    });
  });

  describe("bulk-set-limit", () => {
    it("should update limits for multiple keys from CSV", () => {
      // Create test keys
      const key1 = createTestKey("e2e-bulkset-1@example.com", ["e2e-bulkset"]);
      const key2 = createTestKey("e2e-bulkset-2@example.com", ["e2e-bulkset"]);

      // Create CSV with name,hash
      const csvLines = [
        "name,hash",
        `${key1.name},${key1.hash}`,
        `${key2.name},${key2.hash}`,
      ];

      writeFileSync("test-keys.csv", csvLines.join("\n"));

      const newLimit = 15.0;
      const output = run(`bulk-set-limit test-keys.csv -l ${newLimit} -y`);

      expect(output).toContain("updated successfully");

      // Cleanup
      deleteTestKey(key1.hash);
      deleteTestKey(key2.hash);
    });
  });

  describe("bulk-rotate", () => {
    it("should rotate multiple keys from CSV", () => {
      // Create test keys
      const key1 = createTestKey("e2e-bulkrot-1@example.com", ["e2e-bulkrot"]);
      const key2 = createTestKey("e2e-bulkrot-2@example.com", ["e2e-bulkrot"]);

      // Create CSV with name,hash
      const csvLines = [
        "name,hash",
        `${key1.name},${key1.hash}`,
        `${key2.name},${key2.hash}`,
      ];

      writeFileSync("test-keys.csv", csvLines.join("\n"));

      run(`bulk-rotate test-keys.csv -y -o test-output.csv`);

      expect(existsSync("test-output.csv")).toBe(true);

      const csv = readFileSync("test-output.csv", "utf-8");
      const records = parseCSV(csv);

      expect(records).toHaveLength(2);

      // Cleanup (use new hashes)
      for (const record of records) {
        deleteTestKey(record.hash);
      }
    });
  });

  describe("delete", () => {
    it("should delete a key by hash", () => {
      const email = "e2e-delete-hash@example.com";
      const key = createTestKey(email);

      const output = run(`delete --hash ${key.hash} -y`);
      expect(output).toContain("deleted successfully");

      // Verify it's gone
      run("list --format json -o test-output.json");
      const json = JSON.parse(readFileSync("test-output.json", "utf-8"));
      const deletedKey = json.find((k: any) => k.hash === key.hash);

      expect(deletedKey).toBeUndefined();
    });

    it("should delete keys by pattern", () => {
      const tags = ["e2e-delete-pattern-unique"];
      createTestKey("e2e-delpattern-1@example.com", tags);
      createTestKey("e2e-delpattern-2@example.com", tags);

      run(`delete -p "*${tags[0]}*" -y`);

      // Verify they're gone
      run(`list -p "*${tags[0]}*" --format json -o test-output.json`);
      const json = JSON.parse(readFileSync("test-output.json", "utf-8"));

      expect(json).toHaveLength(0);
    });
  });

  describe("bulk-delete", () => {
    it("should delete multiple keys from CSV", () => {
      // Create keys
      const key1 = createTestKey("e2e-bulkdel-1@example.com", ["e2e-bulkdel"]);
      const key2 = createTestKey("e2e-bulkdel-2@example.com", ["e2e-bulkdel"]);

      // Create delete CSV
      const deleteLines = [
        "name,hash",
        `${key1.name},${key1.hash}`,
        `${key2.name},${key2.hash}`,
      ];

      writeFileSync("test-keys.csv", deleteLines.join("\n"));
      const output = run(`bulk-delete test-keys.csv -y`);

      expect(output).toContain("deleted successfully");

      // Verify they're gone
      run("list --format json -o test-output.json");
      const json = JSON.parse(readFileSync("test-output.json", "utf-8"));
      const found1 = json.find((k: any) => k.hash === key1.hash);
      const found2 = json.find((k: any) => k.hash === key2.hash);

      expect(found1).toBeUndefined();
      expect(found2).toBeUndefined();
    });
  });

  describe("error handling", () => {
    it("should reject invalid email", () => {
      expect(() => {
        run(`create -e invalid-email -l ${TEST_LIMIT}`);
      }).toThrow();
    });

    it("should reject negative limit", () => {
      expect(() => {
        run(`create -e test@example.com -l -5`);
      }).toThrow();
    });

    it("should reject both pattern and hash", () => {
      expect(() => {
        run(`delete -p "*test*" --hash abc123`);
      }).toThrow();
    });

    it("should reject missing pattern or hash", () => {
      expect(() => {
        run(`delete -y`);
      }).toThrow();
    });
  });
});
