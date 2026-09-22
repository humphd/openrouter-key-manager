import { beforeEach, describe, expect, test, vi } from "vitest";
import type { ListData } from "@openrouter/sdk/models/operations";
import type { Workspace } from "@openrouter/sdk/models";

const mocks = vi.hoisted(() => ({
  listKeys: vi.fn(),
  queryAnalytics: vi.fn(),
  resolveWorkspaceRequired: vi.fn(),
}));

vi.mock("../lib/api-client.js", () => ({
  OpenRouterClient: class {
    listKeys = mocks.listKeys;
    queryAnalytics = mocks.queryAnalytics;
  },
}));

vi.mock("../utils/workspaces.js", () => ({
  resolveWorkspaceRequired: mocks.resolveWorkspaceRequired,
}));

import {
  analytics,
  getAnalyticsChunks,
  getAnalyticsRange,
} from "./analytics.js";

const workspace = {
  id: "workspace-uuid",
  name: "Default Workspace",
  slug: "default",
} as Workspace;

function key(name: string, hash: string, disabled: boolean = false): ListData {
  return { name, hash, disabled } as ListData;
}

function rawResult(
  data: Array<Record<string, unknown>>,
  options: {
    queryTimeMs?: number;
    truncated?: boolean;
    warnings?: string[];
  } = {},
) {
  return {
    data,
    metadata: {
      queryTimeMs: options.queryTimeMs ?? 1,
      rowCount: data.length,
      truncated: options.truncated ?? false,
    },
    warnings: options.warnings ?? [],
  };
}

describe("analytics UTC periods", () => {
  const now = new Date("2026-01-01T00:37:42.123Z");

  test.each([
    ["hour", "2025-12-31T23:00:00.000Z", "2026-01-01T00:00:00.000Z"],
    ["day", "2025-12-31T00:00:00.000Z", "2026-01-01T00:00:00.000Z"],
    ["7-days", "2025-12-25T00:00:00.000Z", "2026-01-01T00:00:00.000Z"],
    ["30-days", "2025-12-02T00:00:00.000Z", "2026-01-01T00:00:00.000Z"],
    ["90-days", "2025-10-03T00:00:00.000Z", "2026-01-01T00:00:00.000Z"],
  ] as const)("calculates the completed %s window", (period, start, end) => {
    expect(getAnalyticsRange(period, now)).toEqual({ start, end });
  });

  test("handles month transitions and leap years", () => {
    expect(getAnalyticsRange("day", new Date("2024-03-01T19:00:00Z"))).toEqual({
      start: "2024-02-29T00:00:00.000Z",
      end: "2024-03-01T00:00:00.000Z",
    });
  });

  test("splits 90 days into three contiguous 30-day queries", () => {
    expect(getAnalyticsChunks("90-days", now)).toEqual([
      {
        start: "2025-10-03T00:00:00.000Z",
        end: "2025-11-02T00:00:00.000Z",
      },
      {
        start: "2025-11-02T00:00:00.000Z",
        end: "2025-12-02T00:00:00.000Z",
      },
      {
        start: "2025-12-02T00:00:00.000Z",
        end: "2026-01-01T00:00:00.000Z",
      },
    ]);
  });
});

describe("analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T12:34:00Z"));
    mocks.resolveWorkspaceRequired.mockResolvedValue(workspace);
  });

  test("returns key rows, normalizes numeric strings, and fills zero usage", async () => {
    mocks.listKeys.mockResolvedValue([
      key("alice course", "hash-alice"),
      key("bob course", "hash-bob"),
      key("disabled course", "hash-disabled", true),
    ]);
    mocks.queryAnalytics.mockResolvedValue(
      rawResult([
        {
          api_key_id: "alice course",
          request_count: "2",
          total_usage: 0.5,
          tokens_total: "1000",
          tokens_prompt: "600",
          tokens_completion: "400",
          reasoning_tokens: "100",
          cached_tokens: "300",
        },
      ]),
    );

    const result = await analytics({
      provisioningKey: "test-key",
      pattern: "*course",
    });

    expect(result.view).toBe("keys");
    expect(result.rows).toEqual([
      {
        keyName: "alice course",
        keyHash: "hash-alice",
        disabled: false,
        requests: 2,
        totalSpend: 0.5,
        totalTokens: 1000,
        promptTokens: 600,
        completionTokens: 400,
        reasoningTokens: 100,
        cachedTokens: 300,
        cacheHitRate: 0.5,
        blendedCostPerMillion: 500,
      },
      {
        keyName: "bob course",
        keyHash: "hash-bob",
        disabled: false,
        requests: 0,
        totalSpend: 0,
        totalTokens: 0,
        promptTokens: 0,
        completionTokens: 0,
        reasoningTokens: 0,
        cachedTokens: 0,
        cacheHitRate: 0,
        blendedCostPerMillion: 0,
      },
    ]);
    expect(mocks.listKeys).toHaveBeenCalledOnce();
    expect(mocks.queryAnalytics).toHaveBeenCalledOnce();

    const query = mocks.queryAnalytics.mock.calls[0][0];
    expect(query.dimensions).toEqual(["api_key_id"]);
    expect(query.filters).toEqual([
      { field: "workspace", operator: "eq", value: "workspace-uuid" },
      {
        field: "api_key_id",
        operator: "in",
        value: ["hash-alice", "hash-bob"],
      },
    ]);
  });

  test("includes disabled keys only when requested", async () => {
    mocks.listKeys.mockResolvedValue([
      key("active", "hash-active"),
      key("disabled", "hash-disabled", true),
    ]);
    mocks.queryAnalytics.mockResolvedValue(rawResult([]));

    const result = await analytics({
      provisioningKey: "test-key",
      includeDisabled: true,
    });

    expect(result.rows).toHaveLength(2);
    expect(mocks.queryAnalytics.mock.calls[0][0].filters[1].value).toEqual([
      "hash-active",
      "hash-disabled",
    ]);
  });

  test("keeps duplicate key names as distinct current-key rows", async () => {
    mocks.listKeys.mockResolvedValue([
      key("duplicate", "hash-one"),
      key("duplicate", "hash-two"),
    ]);
    mocks.queryAnalytics.mockResolvedValue(
      rawResult([
        { api_key_id: "duplicate", request_count: "1" },
        { api_key_id: "duplicate", request_count: "2" },
      ]),
    );

    const result = await analytics({ provisioningKey: "test-key" });

    expect(result.rows.map((row) => [row.keyHash, row.requests])).toEqual([
      ["hash-one", 1],
      ["hash-two", 2],
    ]);
  });

  test("queries summary directly without dimensions", async () => {
    mocks.listKeys.mockResolvedValue([key("alice", "hash-alice")]);
    mocks.queryAnalytics.mockResolvedValue(
      rawResult([
        {
          request_count: "4",
          total_usage: 2,
          tokens_total: "400",
          tokens_prompt: "250",
          cached_tokens: "50",
        },
      ]),
    );

    const result = await analytics({
      provisioningKey: "test-key",
      view: "summary",
      period: "day",
    });

    expect(result.view).toBe("summary");
    expect(result.rows[0]).toMatchObject({
      workspaceId: "workspace-uuid",
      workspaceName: "Default Workspace",
      requests: 4,
      cacheHitRate: 0.2,
      blendedCostPerMillion: 5000,
    });
    expect(mocks.queryAnalytics.mock.calls[0][0].dimensions).toBeUndefined();
  });

  test("merges models and metadata across all 90-day chunks", async () => {
    mocks.listKeys.mockResolvedValue([key("alice", "hash-alice")]);
    mocks.queryAnalytics
      .mockResolvedValueOnce(
        rawResult(
          [
            {
              model: "openai/test",
              request_count: "2",
              total_usage: 1,
              tokens_total: "100",
              tokens_prompt: "80",
              cached_tokens: "20",
            },
          ],
          { queryTimeMs: 5, warnings: ["first warning"] },
        ),
      )
      .mockResolvedValueOnce(
        rawResult(
          [
            {
              model: "openai/test",
              request_count: "3",
              total_usage: 2,
              tokens_total: "300",
              tokens_prompt: "120",
              cached_tokens: "60",
            },
          ],
          { queryTimeMs: 7, truncated: true },
        ),
      )
      .mockResolvedValueOnce(
        rawResult(
          [
            {
              model: "anthropic/test",
              request_count: "1",
              total_usage: 0.5,
              tokens_total: "100",
              tokens_prompt: "50",
            },
          ],
          { queryTimeMs: 11, warnings: ["third warning"] },
        ),
      );

    const result = await analytics({
      provisioningKey: "test-key",
      view: "models",
      period: "90-days",
    });

    expect(mocks.queryAnalytics).toHaveBeenCalledTimes(3);
    expect(result).toMatchObject({
      queryCount: 3,
      queryTimeMs: 23,
      truncated: true,
      warnings: ["first warning", "third warning"],
    });
    expect(result.rows[0]).toMatchObject({
      model: "openai/test",
      requests: 5,
      totalSpend: 3,
      totalTokens: 400,
      promptTokens: 200,
      cachedTokens: 80,
      cacheHitRate: 0.4,
      blendedCostPerMillion: 7500,
    });
    expect(
      mocks.queryAnalytics.mock.calls.map(
        ([query]) =>
          query.timeRange.end.getTime() - query.timeRange.start.getTime(),
      ),
    ).toEqual([30, 30, 30].map((days) => days * 24 * 60 * 60 * 1000));
  });

  test("does not query when no current keys match", async () => {
    mocks.listKeys.mockResolvedValue([key("alice", "hash-alice")]);

    const result = await analytics({
      provisioningKey: "test-key",
      pattern: "bob*",
    });

    expect(result.rows).toEqual([]);
    expect(result.queryCount).toBe(0);
    expect(mocks.queryAnalytics).not.toHaveBeenCalled();
  });

  test("returns one zero summary row when no current keys match", async () => {
    mocks.listKeys.mockResolvedValue([]);

    const result = await analytics({
      provisioningKey: "test-key",
      view: "summary",
    });

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({ requests: 0, totalSpend: 0 });
    expect(result.queryCount).toBe(0);
  });

  test("rejects unsupported periods", async () => {
    await expect(
      analytics({
        provisioningKey: "test-key",
        period: "week" as never,
      }),
    ).rejects.toThrow("Unsupported analytics period: week");
  });
});
