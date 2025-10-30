import { OpenRouterClient } from "../lib/api-client.js";
import { getSelectedKeys } from "../lib/key-selector.js";
import { getProvisioningKey } from "../utils/config.js";
import type { GlobalOptions } from "../types.js";

export interface EnableOptions extends GlobalOptions {
  pattern?: string;
  hash?: string;
  confirm?: boolean;
}

export interface EnableResult {
  modified: string[];
  errors: Array<{ keyName: string; error: string }>;
}

export async function enable(options: EnableOptions): Promise<EnableResult> {
  const provisioningKey = getProvisioningKey(options.provisioningKey);
  const client = new OpenRouterClient(provisioningKey);
  const keysToModify = await getSelectedKeys(options);

  const modified: string[] = [];
  const errors: Array<{ keyName: string; error: string }> = [];

  for (const key of keysToModify) {
    try {
      await client.enableKey(key.hash);
      modified.push(key.name);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      errors.push({
        keyName: key.name,
        error: errorMessage,
      });
    }
  }

  return { modified, errors };
}
