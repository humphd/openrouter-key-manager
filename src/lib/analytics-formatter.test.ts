import { afterEach, describe, expect, test, vi } from "vitest";
import { readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import type { AnalyticsResult } from "../commands/analytics.js";
import {
  formatAnalyticsAsCsv,
  formatAnalyticsAsJson,
  formatAnalyticsAsTable,
  outputAnalytics,
} from "./analytics-formatter.js";

const outputPath = join(process.cwd(), "analytics-output-test.json");

const result: AnalyticsResult = {
  view: "keys",
  workspace: {
    id: "workspace-id",
    name: "Default Workspace",
    slug: "default",
  },
  period: "30-days",
  range: {
    start: "2026-01-01T00:00:00.000Z",
    end: "2026-01-31T00:00:00.000Z",
  },
  queryCount: 1,
  queryTimeMs: 12,
  truncated: false,
  warnings: [],
  rows: [
    {
      keyName: 'alice, "class"',
      keyHash: "hash-alice",
      disabled: false,
      requests: 3,
      totalSpend: 1.25,
      totalTokens: 500,
      promptTokens: 300,
      completionTokens: 200,
      reasoningTokens: 50,
      cachedTokens: 75,
      cacheHitRate: 0.25,
      blendedCostPerMillion: 2500,
    },
  ],
};

afterEach(async () => {
  await rm(outputPath, { force: true });
  vi.restoreAllMocks();
});

describe("analytics formatters", () => {
  test("formats a readable table with all curated metrics", () => {
    const table = formatAnalyticsAsTable(result);

    expect(table).toContain("Key Name");
    expect(table).toContain("Reasoning Tokens");
    expect(table).toContain("Cache Hit Rate");
    expect(table).toContain("25.00%");
    expect(table).toContain("$2500.0000");
  });

  test("formats JSON with result metadata and normalized rows", () => {
    expect(JSON.parse(formatAnalyticsAsJson(result))).toEqual(result);
  });

  test("formats CSV and escapes identity fields", () => {
    const csv = formatAnalyticsAsCsv(result);

    expect(csv).toContain(
      "key_name,key_hash,disabled,requests,total_spend,total_tokens,prompt_tokens,completion_tokens,reasoning_tokens,cached_tokens,cache_hit_rate,blended_cost_per_million",
    );
    expect(csv).toContain('"alice, ""class""",hash-alice,false,3,1.25');
  });

  test("keeps headers for empty model output", () => {
    const empty: AnalyticsResult = {
      ...result,
      view: "models",
      rows: [],
    };

    expect(formatAnalyticsAsCsv(empty)).toMatch(/^model,requests/);
    expect(formatAnalyticsAsTable(empty)).toContain("Model");
  });

  test("writes output to a file", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    await outputAnalytics(result, "json", outputPath);

    expect(JSON.parse(await readFile(outputPath, "utf8"))).toEqual(result);
    expect(error).toHaveBeenCalledWith(`Output written to ${outputPath}`);
  });
});
