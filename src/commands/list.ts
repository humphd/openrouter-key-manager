import chalk from "chalk";
import { minimatch } from "minimatch";
import { OpenRouterClient } from "../lib/api-client.js";
import { validateFormat } from "../lib/validators.js";
import { getProvisioningKey } from "../utils/config.js";
import { outputKeyList, type KeyListItem } from "../lib/output-formatter.js";

interface ListOptions {
  pattern?: string;
  format?: string;
  output?: string;
  includeDisabled?: boolean;
}

interface GlobalOptions {
  provisioningKey?: string;
}

export async function listCommand(
  options: ListOptions,
  globalOptions: GlobalOptions
): Promise<void> {
  const provisioningKey = getProvisioningKey(globalOptions.provisioningKey);

  const client = new OpenRouterClient(provisioningKey);
  const allKeys = await client.listKeys();

  let filteredKeys = allKeys;

  // Filter by pattern if specified
  if (options.pattern) {
    filteredKeys = filteredKeys.filter((key) =>
      minimatch(key.name, options.pattern!)
    );
  }

  // Filter disabled keys unless explicitly included
  if (!options.includeDisabled) {
    filteredKeys = filteredKeys.filter((key) => !key.disabled);
  }

  const keyList: KeyListItem[] = filteredKeys.map((key) => ({
    name: key.name,
    hash: key.hash,
    disabled: key.disabled,
    remaining: key.limit_remaining ?? null,
  }));

  console.error(chalk.blue(`Found ${keyList.length} key(s)\n`));

  const format = validateFormat(options.format || "table");
  await outputKeyList(keyList, format, options.output);
}
