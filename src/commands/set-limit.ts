import { OpenRouterClient } from "../lib/api-client.js";
import { getSelectedKeys } from "../lib/key-selector.js";
import { validateLimit } from "../lib/validators.js";
import { getProvisioningKey } from "../utils/config.js";
import type { GlobalOptions } from "../types.js";

export interface SetLimitOptions extends GlobalOptions {
  pattern?: string;
  hash?: string;
  limit: number;
  confirm?: boolean;
}

export interface SetLimitResult {
  updated: string[];
  errors: Array<{ keyName: string; error: string }>;
}

export async function setLimit(
  options: SetLimitOptions
): Promise<SetLimitResult> {
  validateLimit(options.limit);

  const provisioningKey = getProvisioningKey(options.provisioningKey);
  const client = new OpenRouterClient(provisioningKey);
  const keysToModify = await getSelectedKeys(options);

  const updated: string[] = [];
  const errors: Array<{ keyName: string; error: string }> = [];

  for (const key of keysToModify) {
    try {
      await client.setKeyLimit(key.hash, options.limit);
      updated.push(key.name);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      errors.push({
        keyName: key.name,
        error: errorMessage,
      });
    }
  }

  return { updated, errors };
}
