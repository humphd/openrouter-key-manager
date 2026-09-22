import { writeFile } from "node:fs/promises";
import Table from "cli-table3";
import type {
  AnalyticsMetrics,
  AnalyticsResult,
} from "../commands/analytics.js";
import type { OutputFormat } from "../types.js";

const METRIC_HEADERS = [
  "Requests",
  "Total Spend",
  "Total Tokens",
  "Prompt Tokens",
  "Completion Tokens",
  "Reasoning Tokens",
  "Cached Tokens",
  "Cache Hit Rate",
  "Blended $/1M",
];

const METRIC_CSV_HEADERS = [
  "requests",
  "total_spend",
  "total_tokens",
  "prompt_tokens",
  "completion_tokens",
  "reasoning_tokens",
  "cached_tokens",
  "cache_hit_rate",
  "blended_cost_per_million",
];

function escapeCsv(value: string | number | boolean): string {
  const text = String(value);
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function metricTableCells(metrics: AnalyticsMetrics): Array<string | number> {
  return [
    metrics.requests,
    `$${metrics.totalSpend.toFixed(4)}`,
    metrics.totalTokens,
    metrics.promptTokens,
    metrics.completionTokens,
    metrics.reasoningTokens,
    metrics.cachedTokens,
    `${(metrics.cacheHitRate * 100).toFixed(2)}%`,
    `$${metrics.blendedCostPerMillion.toFixed(4)}`,
  ];
}

function metricCsvCells(metrics: AnalyticsMetrics): number[] {
  return [
    metrics.requests,
    metrics.totalSpend,
    metrics.totalTokens,
    metrics.promptTokens,
    metrics.completionTokens,
    metrics.reasoningTokens,
    metrics.cachedTokens,
    metrics.cacheHitRate,
    metrics.blendedCostPerMillion,
  ];
}

export function formatAnalyticsAsTable(result: AnalyticsResult): string {
  const identityHeaders =
    result.view === "keys"
      ? ["Key Name", "Key Hash", "Disabled"]
      : result.view === "models"
        ? ["Model"]
        : ["Workspace"];
  const table = new Table({ head: [...identityHeaders, ...METRIC_HEADERS] });

  if (result.view === "keys") {
    for (const row of result.rows) {
      table.push([
        row.keyName,
        row.keyHash,
        row.disabled ? "Yes" : "No",
        ...metricTableCells(row),
      ]);
    }
  } else if (result.view === "models") {
    for (const row of result.rows) {
      table.push([row.model, ...metricTableCells(row)]);
    }
  } else {
    for (const row of result.rows) {
      table.push([row.workspaceName, ...metricTableCells(row)]);
    }
  }

  return table.toString();
}

export function formatAnalyticsAsJson(result: AnalyticsResult): string {
  return JSON.stringify(result, null, 2);
}

export function formatAnalyticsAsCsv(result: AnalyticsResult): string {
  const identityHeaders =
    result.view === "keys"
      ? ["key_name", "key_hash", "disabled"]
      : result.view === "models"
        ? ["model"]
        : ["workspace_id", "workspace_name"];
  const lines = [[...identityHeaders, ...METRIC_CSV_HEADERS].join(",")];

  if (result.view === "keys") {
    for (const row of result.rows) {
      lines.push(
        [row.keyName, row.keyHash, row.disabled, ...metricCsvCells(row)]
          .map(escapeCsv)
          .join(","),
      );
    }
  } else if (result.view === "models") {
    for (const row of result.rows) {
      lines.push([row.model, ...metricCsvCells(row)].map(escapeCsv).join(","));
    }
  } else {
    for (const row of result.rows) {
      lines.push(
        [row.workspaceId, row.workspaceName, ...metricCsvCells(row)]
          .map(escapeCsv)
          .join(","),
      );
    }
  }

  return lines.join("\n");
}

export function formatAnalytics(
  result: AnalyticsResult,
  format: OutputFormat,
): string {
  switch (format) {
    case "table":
      return formatAnalyticsAsTable(result);
    case "json":
      return formatAnalyticsAsJson(result);
    case "csv":
      return formatAnalyticsAsCsv(result);
  }
}

export async function outputAnalytics(
  result: AnalyticsResult,
  format: OutputFormat,
  outputFile?: string,
): Promise<void> {
  const formatted = formatAnalytics(result, format);
  if (outputFile) {
    await writeFile(outputFile, formatted, "utf-8");
    console.error(`Output written to ${outputFile}`);
  } else {
    console.log(formatted);
  }
}
