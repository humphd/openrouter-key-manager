import { OpenRouterClient } from "../lib/api-client.js";
import { getSelectedKeys } from "../lib/key-selector.js";
import { getProvisioningKey } from "../utils/config.js";
import { resolveWorkspace } from "../utils/workspaces.js";
import type { GlobalOptions } from "../types.js";

export interface DisableOptions extends GlobalOptions {
  pattern?: string;
  hash?: string;
  confirm?: boolean;
}

export interface DisableResult {
  modified: string[];
  errors: Array<{ keyName: string; error: string }>;
}

export async function disable(options: DisableOptions): Promise<DisableResult> {
  const provisioningKey = getProvisioningKey(options.provisioningKey);
  const workspace = await resolveWorkspace(provisioningKey, options.workspace);

  const client = new OpenRouterClient(provisioningKey, { workspace });
  const keysToModify = await getSelectedKeys(options, client);

  const modified: string[] = [];
  const errors: Array<{ keyName: string; error: string }> = [];

  for (const key of keysToModify) {
    try {
      await client.disableKey(key.hash);
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
