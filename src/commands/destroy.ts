import { OpenRouterClient } from "../lib/api-client.js";
import { getSelectedKeys } from "../lib/key-selector.js";
import { getProvisioningKey } from "../utils/config.js";
import type { GlobalOptions } from "../types.js";

export interface DestroyOptions extends GlobalOptions {
  pattern?: string;
  hash?: string;
  confirm?: boolean;
}

export interface DestroyResult {
  deleted: string[];
  errors: Array<{ keyName: string; error: string }>;
}

export async function destroy(options: DestroyOptions): Promise<DestroyResult> {
  const provisioningKey = getProvisioningKey(options.provisioningKey);
  const client = new OpenRouterClient(provisioningKey);
  const keysToDelete = await getSelectedKeys(options);

  const deleted: string[] = [];
  const errors: Array<{ keyName: string; error: string }> = [];

  for (const key of keysToDelete) {
    try {
      await client.deleteKeyByHash(key.hash);
      deleted.push(key.name);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      errors.push({
        keyName: key.name,
        error: errorMessage,
      });
    }
  }

  return { deleted, errors };
}
