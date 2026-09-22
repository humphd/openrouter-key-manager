import { minimatch } from "minimatch";
import type { Workspace } from "@openrouter/sdk/models";
import type { ListData } from "@openrouter/sdk/models/operations";
import {
  OpenRouterClient,
  type AnalyticsQuery,
  type RawAnalyticsResult,
  type RawAnalyticsRow,
} from "../lib/api-client.js";
import type { GlobalOptions } from "../types.js";
import { getProvisioningKey } from "../utils/config.js";
import { resolveWorkspaceRequired } from "../utils/workspaces.js";

export type AnalyticsView = "keys" | "summary" | "models";
export type AnalyticsPeriod = "hour" | "day" | "7-days" | "30-days" | "90-days";

export interface AnalyticsOptions extends GlobalOptions {
  view?: AnalyticsView;
  period?: AnalyticsPeriod;
  pattern?: string;
  includeDisabled?: boolean;
}

export interface AnalyticsRange {
  start: string;
  end: string;
}

export interface AnalyticsMetrics {
  requests: number;
  totalSpend: number;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  reasoningTokens: number;
  cachedTokens: number;
  cacheHitRate: number;
  blendedCostPerMillion: number;
}

export interface AnalyticsKeyRow extends AnalyticsMetrics {
  keyName: string;
  keyHash: string;
  disabled: boolean;
}

export interface AnalyticsSummaryRow extends AnalyticsMetrics {
  workspaceId: string;
  workspaceName: string;
}

export interface AnalyticsModelRow extends AnalyticsMetrics {
  model: string;
}

interface AnalyticsResultBase {
  workspace: Pick<Workspace, "id" | "name" | "slug">;
  period: AnalyticsPeriod;
  range: AnalyticsRange;
  queryCount: number;
  queryTimeMs: number;
  truncated: boolean;
  warnings: string[];
}

export type AnalyticsResult =
  | (AnalyticsResultBase & {
      view: "keys";
      rows: AnalyticsKeyRow[];
    })
  | (AnalyticsResultBase & {
      view: "summary";
      rows: [AnalyticsSummaryRow];
    })
  | (AnalyticsResultBase & {
      view: "models";
      rows: AnalyticsModelRow[];
    });

const PERIODS = new Set<AnalyticsPeriod>([
  "hour",
  "day",
  "7-days",
  "30-days",
  "90-days",
]);
const VIEWS = new Set<AnalyticsView>(["keys", "summary", "models"]);

const ADDITIVE_METRICS = [
  "request_count",
  "total_usage",
  "tokens_total",
  "tokens_prompt",
  "tokens_completion",
  "reasoning_tokens",
  "cached_tokens",
] as const;

type AdditiveMetrics = Omit<
  AnalyticsMetrics,
  "cacheHitRate" | "blendedCostPerMillion"
>;

interface ChunkResult {
  result: RawAnalyticsResult;
  range: AnalyticsRange;
}

function subtractUtcDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() - days);
  return result;
}

function addUtcDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function getAnalyticsRange(
  period: AnalyticsPeriod,
  now: Date = new Date(),
): AnalyticsRange {
  if (!PERIODS.has(period)) {
    throw new Error(`Unsupported analytics period: ${period}`);
  }

  if (period === "hour") {
    const end = new Date(now);
    end.setUTCMinutes(0, 0, 0);
    const start = new Date(end.getTime() - 60 * 60 * 1000);
    return { start: start.toISOString(), end: end.toISOString() };
  }

  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const days = period === "day" ? 1 : Number.parseInt(period, 10);
  const start = subtractUtcDays(end, days);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function getAnalyticsChunks(
  period: AnalyticsPeriod,
  now: Date = new Date(),
): AnalyticsRange[] {
  const range = getAnalyticsRange(period, now);
  if (period !== "90-days") {
    return [range];
  }

  const chunks: AnalyticsRange[] = [];
  let start = new Date(range.start);
  const overallEnd = new Date(range.end);

  while (start < overallEnd) {
    const end = addUtcDays(start, 30);
    chunks.push({ start: start.toISOString(), end: end.toISOString() });
    start = end;
  }

  return chunks;
}

function zeroAdditiveMetrics(): AdditiveMetrics {
  return {
    requests: 0,
    totalSpend: 0,
    totalTokens: 0,
    promptTokens: 0,
    completionTokens: 0,
    reasoningTokens: 0,
    cachedTokens: 0,
  };
}

function numberValue(row: RawAnalyticsRow, field: string): number {
  const value = row[field];
  const number = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function metricsFromRow(row: RawAnalyticsRow): AdditiveMetrics {
  return {
    requests: numberValue(row, "request_count"),
    totalSpend: numberValue(row, "total_usage"),
    totalTokens: numberValue(row, "tokens_total"),
    promptTokens: numberValue(row, "tokens_prompt"),
    completionTokens: numberValue(row, "tokens_completion"),
    reasoningTokens: numberValue(row, "reasoning_tokens"),
    cachedTokens: numberValue(row, "cached_tokens"),
  };
}

function addMetrics(target: AdditiveMetrics, source: AdditiveMetrics): void {
  target.requests += source.requests;
  target.totalSpend += source.totalSpend;
  target.totalTokens += source.totalTokens;
  target.promptTokens += source.promptTokens;
  target.completionTokens += source.completionTokens;
  target.reasoningTokens += source.reasoningTokens;
  target.cachedTokens += source.cachedTokens;
}

function withDerivedMetrics(metrics: AdditiveMetrics): AnalyticsMetrics {
  return {
    ...metrics,
    cacheHitRate:
      metrics.promptTokens === 0
        ? 0
        : metrics.cachedTokens / metrics.promptTokens,
    blendedCostPerMillion:
      metrics.totalTokens === 0
        ? 0
        : (metrics.totalSpend / metrics.totalTokens) * 1_000_000,
  };
}

function selectKeys(
  allKeys: ListData[],
  options: AnalyticsOptions,
): ListData[] {
  return allKeys.filter((key) => {
    if (!options.includeDisabled && key.disabled) {
      return false;
    }
    return !options.pattern || minimatch(key.name, options.pattern);
  });
}

function buildQuery(
  view: AnalyticsView,
  workspaceId: string,
  keyHashes: string[],
  range: AnalyticsRange,
): AnalyticsQuery {
  return {
    metrics: [...ADDITIVE_METRICS],
    ...(view === "keys"
      ? { dimensions: ["api_key_id"] }
      : view === "models"
        ? { dimensions: ["model"] }
        : {}),
    filters: [
      { field: "workspace", operator: "eq", value: workspaceId },
      { field: "api_key_id", operator: "in", value: keyHashes },
    ],
    timeRange: {
      start: new Date(range.start),
      end: new Date(range.end),
    },
  };
}

function resultMetadata(chunks: ChunkResult[]) {
  return {
    queryCount: chunks.length,
    queryTimeMs: chunks.reduce(
      (total, chunk) => total + chunk.result.metadata.queryTimeMs,
      0,
    ),
    truncated: chunks.some((chunk) => chunk.result.metadata.truncated),
    warnings: chunks.flatMap((chunk) => chunk.result.warnings),
  };
}

function keyRows(keys: ListData[], chunks: ChunkResult[]): AnalyticsKeyRow[] {
  const totals = new Map(
    keys.map((key) => [key.hash, zeroAdditiveMetrics()] as const),
  );
  const keysByName = new Map<string, ListData[]>();
  const keysByHash = new Map(keys.map((key) => [key.hash, key] as const));

  for (const key of keys) {
    const namedKeys = keysByName.get(key.name) ?? [];
    namedKeys.push(key);
    keysByName.set(key.name, namedKeys);
  }

  for (const chunk of chunks) {
    const occurrenceByName = new Map<string, number>();

    for (const row of chunk.result.data) {
      const name = String(row.api_key_id ?? "");
      const hashKey = keysByHash.get(name);
      const namedKeys = hashKey ? [hashKey] : keysByName.get(name);
      if (!namedKeys || namedKeys.length === 0) {
        continue;
      }

      const occurrence = occurrenceByName.get(name) ?? 0;
      const key = namedKeys[Math.min(occurrence, namedKeys.length - 1)];
      occurrenceByName.set(name, occurrence + 1);
      addMetrics(totals.get(key.hash)!, metricsFromRow(row));
    }
  }

  return keys.map((key) => ({
    keyName: key.name,
    keyHash: key.hash,
    disabled: key.disabled,
    ...withDerivedMetrics(totals.get(key.hash)!),
  }));
}

function summaryRows(
  workspace: Workspace,
  chunks: ChunkResult[],
): [AnalyticsSummaryRow] {
  const total = zeroAdditiveMetrics();
  for (const chunk of chunks) {
    for (const row of chunk.result.data) {
      addMetrics(total, metricsFromRow(row));
    }
  }

  return [
    {
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      ...withDerivedMetrics(total),
    },
  ];
}

function modelRows(chunks: ChunkResult[]): AnalyticsModelRow[] {
  const totals = new Map<string, AdditiveMetrics>();

  for (const chunk of chunks) {
    for (const row of chunk.result.data) {
      const model = String(row.model ?? "");
      const total = totals.get(model) ?? zeroAdditiveMetrics();
      addMetrics(total, metricsFromRow(row));
      totals.set(model, total);
    }
  }

  return [...totals.entries()]
    .map(([model, metrics]) => ({ model, ...withDerivedMetrics(metrics) }))
    .sort(
      (left, right) =>
        right.totalSpend - left.totalSpend ||
        left.model.localeCompare(right.model),
    );
}

export async function analytics(
  options: AnalyticsOptions = {},
): Promise<AnalyticsResult> {
  const view = options.view ?? "keys";
  const period = options.period ?? "30-days";

  if (!PERIODS.has(period)) {
    throw new Error(`Unsupported analytics period: ${String(period)}`);
  }
  if (!VIEWS.has(view)) {
    throw new Error(`Unsupported analytics view: ${String(view)}`);
  }

  const provisioningKey = getProvisioningKey(options.provisioningKey);
  const workspace = await resolveWorkspaceRequired(
    provisioningKey,
    options.workspace,
  );
  const client = new OpenRouterClient(provisioningKey, { workspace });
  const selectedKeys = selectKeys(await client.listKeys(true), options);
  const now = new Date();
  const range = getAnalyticsRange(period, now);
  const base = {
    workspace: {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
    },
    period,
    range,
  };

  if (selectedKeys.length === 0) {
    const emptyMetadata = {
      queryCount: 0,
      queryTimeMs: 0,
      truncated: false,
      warnings: [],
    };

    if (view === "summary") {
      return {
        ...base,
        ...emptyMetadata,
        view,
        rows: summaryRows(workspace, []),
      };
    }

    return {
      ...base,
      ...emptyMetadata,
      view,
      rows: [],
    } as AnalyticsResult;
  }

  const chunks = await Promise.all(
    getAnalyticsChunks(period, now).map(async (chunkRange) => ({
      range: chunkRange,
      result: await client.queryAnalytics(
        buildQuery(
          view,
          workspace.id,
          selectedKeys.map((key) => key.hash),
          chunkRange,
        ),
      ),
    })),
  );
  const metadata = resultMetadata(chunks);

  if (view === "summary") {
    return {
      ...base,
      ...metadata,
      view,
      rows: summaryRows(workspace, chunks),
    };
  }

  if (view === "models") {
    return {
      ...base,
      ...metadata,
      view,
      rows: modelRows(chunks),
    };
  }

  return {
    ...base,
    ...metadata,
    view,
    rows: keyRows(selectedKeys, chunks),
  };
}
