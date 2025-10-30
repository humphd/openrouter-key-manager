import { minimatch } from "minimatch";
import { OpenRouterClient } from "../lib/api-client.js";
import { getProvisioningKey } from "../utils/config.js";
import type { KeyListItem } from "../lib/output-formatter.js";
import type { GlobalOptions, OutputFormat } from "../types.js";

export interface ListOptions extends GlobalOptions {
  pattern?: string;
  includeDisabled?: boolean;
  format?: OutputFormat;
  output?: string;
  full?: boolean;
}

export type ListResult = KeyListItem[];

export async function list(options: ListOptions): Promise<ListResult> {
  const provisioningKey = getProvisioningKey(options.provisioningKey);
  const { pattern, includeDisabled } = options;

  const client = new OpenRouterClient(provisioningKey);
  const allKeys = await client.listKeys(includeDisabled);

  let filteredKeys = allKeys;
  // Filter by pattern if specified
  if (pattern) {
    filteredKeys = filteredKeys.filter((key) => minimatch(key.name, pattern));
  }

  return filteredKeys.map((key) => ({
    name: key.name,
    hash: key.hash,
    disabled: key.disabled,
    remaining: key.limit_remaining ?? null,
  }));
}
