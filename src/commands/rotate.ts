import { OpenRouterClient } from "../lib/api-client.js";
import { getSelectedKeys } from "../lib/key-selector.js";
import { getProvisioningKey, getTodayDate } from "../utils/config.js";
import type { GlobalOptions, KeyInfo } from "../types.js";

export interface RotateOptions extends GlobalOptions {
  pattern?: string;
  hash?: string;
  confirm?: boolean;
  output?: string;
}

export interface RotateResult {
  rotated: KeyInfo[];
  errors: Array<{ keyName: string; error: string }>;
}

export async function rotate(options: RotateOptions): Promise<RotateResult> {
  const provisioningKey = getProvisioningKey(options.provisioningKey);
  const client = new OpenRouterClient(provisioningKey);
  const keysToRotate = await getSelectedKeys(options);

  const rotated: KeyInfo[] = [];
  const errors: Array<{ keyName: string; error: string }> = [];

  for (const oldKey of keysToRotate) {
    try {
      // Get full key details (in case we need them)
      const keyDetails = await client.getKey(oldKey.hash);

      // Delete old key
      await client.deleteKeyByHash(oldKey.hash);

      // Create new key with same name and limit
      const { key: newApiKey, hash: newHash } = await client.createKey(
        keyDetails.name,
        keyDetails.limit ?? 0
      );

      rotated.push({
        email: "", // Not parsed from name
        tags: [], // Not parsed from name
        issuedDate: getTodayDate(),
        keyName: keyDetails.name,
        apiKey: newApiKey,
        hash: newHash,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      errors.push({
        keyName: oldKey.name,
        error: errorMessage,
      });
    }
  }

  return { rotated, errors };
}
