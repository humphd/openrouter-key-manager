import { OpenRouterClient } from "../lib/api-client.js";
import { parseKeyFile } from "../lib/file-parser.js";
import { validateLimit } from "../lib/validators.js";
import { getProvisioningKey } from "../utils/config.js";
import type { GlobalOptions } from "../types.js";

export interface BulkSetLimitOptions extends GlobalOptions {
  limit: number;
  delimiter?: string;
  skipHeader?: boolean;
  confirm?: boolean;
}

export interface BulkSetLimitResult {
  updated: string[];
  errors: Array<{ key: string; error: string }>;
}

export async function bulkSetLimit(
  filePath: string,
  options: BulkSetLimitOptions,
): Promise<BulkSetLimitResult> {
  validateLimit(options.limit);

  const provisioningKey = getProvisioningKey(options.provisioningKey);
  const keys = await parseKeyFile(
    filePath,
    options.delimiter,
    options.skipHeader ?? true,
  );

  const client = new OpenRouterClient(provisioningKey);
  const updated: string[] = [];
  const errors: Array<{ key: string; error: string }> = [];

  for (const key of keys) {
    try {
      await client.setKeyLimit(key.hash, options.limit);
      updated.push(key.name);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      errors.push({
        key: key.name,
        error: errorMessage,
      });
    }
  }

  return { updated, errors };
}
