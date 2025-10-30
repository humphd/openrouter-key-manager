import { OpenRouterClient } from "../lib/api-client.js";
import { parseKeyFile } from "../lib/file-parser.js";
import { getProvisioningKey, getTodayDate } from "../utils/config.js";
import type { GlobalOptions, KeyInfo } from "../types.js";

export interface BulkRotateOptions extends GlobalOptions {
  delimiter?: string;
  skipHeader?: boolean;
  confirm?: boolean;
  output?: string;
}

export interface BulkRotateResult {
  rotated: KeyInfo[];
  errors: Array<{ key: string; error: string }>;
}

export async function bulkRotate(
  filePath: string,
  options: BulkRotateOptions,
): Promise<BulkRotateResult> {
  const provisioningKey = getProvisioningKey(options.provisioningKey);
  const keys = await parseKeyFile(
    filePath,
    options.delimiter,
    options.skipHeader ?? true,
  );

  const client = new OpenRouterClient(provisioningKey);
  const rotated: KeyInfo[] = [];
  const errors: Array<{ key: string; error: string }> = [];

  for (const key of keys) {
    try {
      // Get full key details
      const keyDetails = await client.getKey(key.hash);

      // Delete old key
      await client.deleteKeyByHash(key.hash);

      // Create new key with same name and limit
      const { key: newApiKey, hash: newHash } = await client.createKey(
        keyDetails.name,
        keyDetails.limit ?? 0,
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
        key: key.name,
        error: errorMessage,
      });
    }
  }

  return { rotated, errors };
}
