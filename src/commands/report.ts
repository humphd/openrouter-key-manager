import { minimatch } from "minimatch";
import { OpenRouterClient } from "../lib/api-client.js";
import { getProvisioningKey } from "../utils/config.js";
import type { GlobalOptions } from "../types.js";
import { generateHTML } from "../lib/html-report.js";

export interface ReportOptions extends GlobalOptions {
  pattern?: string;
  includeDisabled?: boolean;
  output?: string;
}

export interface ReportResult {
  html: string;
  keyCount: number;
}

export async function report(options: ReportOptions): Promise<ReportResult> {
  const provisioningKey = getProvisioningKey(options.provisioningKey);
  const client = new OpenRouterClient(provisioningKey);
  const allKeys = await client.listKeys(true);

  let filteredKeys = allKeys;

  // Filter by pattern if specified
  if (options.pattern) {
    filteredKeys = filteredKeys.filter((key) =>
      minimatch(key.name, options.pattern!),
    );
  }

  // Filter disabled keys unless explicitly included
  if (!options.includeDisabled) {
    filteredKeys = filteredKeys.filter((key) => !key.disabled);
  }

  const html = generateHTML(filteredKeys);

  return {
    html,
    keyCount: filteredKeys.length,
  };
}
