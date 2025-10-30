import { OpenRouterClient } from "../lib/api-client.js";
import { parseKeyFile } from "../lib/file-parser.js";
import { getProvisioningKey } from "../utils/config.js";
import type { GlobalOptions } from "../types.js";

export interface BulkDestroyOptions extends GlobalOptions {
  delimiter?: string;
  skipHeader?: boolean;
}

export interface BulkDestroyResult {
  deleted: string[];
  errors: Array<{ key: string; error: string }>;
}

export async function bulkDestroy(
  filePath: string,
  options: BulkDestroyOptions
): Promise<BulkDestroyResult> {
  const provisioningKey = getProvisioningKey(options.provisioningKey);
  const keys = await parseKeyFile(
    filePath,
    options.delimiter,
    options.skipHeader ?? true
  );

  const client = new OpenRouterClient(provisioningKey);
  const deleted: string[] = [];
  const errors: Array<{ key: string; error: string }> = [];

  for (const key of keys) {
    try {
      await client.deleteKeyByHash(key.hash);
      deleted.push(key.name);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      errors.push({
        key: key.name,
        error: errorMessage,
      });
    }
  }

  return { deleted, errors };
}
