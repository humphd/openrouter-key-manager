import { minimatch } from "minimatch";
import { OpenRouterClient } from "./api-client.js";
import { getProvisioningKey } from "../utils/config.js";
import type { GlobalOptions } from "../types.js";

export interface KeySelectorOptions extends GlobalOptions {
  pattern?: string;
  hash?: string;
}

export interface SelectedKey {
  name: string;
  hash: string;
  limit: number | null;
}

export async function getSelectedKeys(
  options: KeySelectorOptions
): Promise<SelectedKey[]> {
  // Validate that only one of pattern or hash is provided
  if (options.pattern && options.hash) {
    throw new Error("Cannot specify both --pattern and --hash. Choose one.");
  }

  if (!options.pattern && !options.hash) {
    throw new Error("Either --pattern or --hash must be provided");
  }

  const provisioningKey = getProvisioningKey(options.provisioningKey);
  const client = new OpenRouterClient(provisioningKey);

  // Get all keys
  const allKeys = await client.listKeys(true);
  let selectedKeys = allKeys;

  // Filter by hash if provided
  if (options.hash) {
    selectedKeys = allKeys.filter((k) => k.hash === options.hash);
    if (selectedKeys.length === 0) {
      throw new Error(`No key found with hash: ${options.hash}`);
    }
  }
  // Filter by pattern if provided
  else if (options.pattern) {
    selectedKeys = allKeys.filter((k) => minimatch(k.name, options.pattern!));
    if (selectedKeys.length === 0) {
      throw new Error(`No keys match pattern: ${options.pattern}`);
    }
  }

  return selectedKeys.map((k) => ({
    name: k.name,
    hash: k.hash,
    limit: k.limit,
  }));
}
