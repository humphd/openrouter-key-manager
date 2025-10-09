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
  const { pattern, includeDisabled } = options;

  const client = new OpenRouterClient(provisioningKey);
  const allKeys = await client.listKeys(includeDisabled);

  let filteredKeys = allKeys;
  // Filter by pattern if specified
  if (pattern) {
    filteredKeys = filteredKeys.filter((key) => minimatch(key.name, pattern));
  }

  const keyList: KeyListItem[] = filteredKeys.map((key) => ({
    name: key.name,
    hash: key.hash,
    disabled: key.disabled,
    remaining: key.limit_remaining ?? null,
  }));

  console.error(chalk.blue(`Found ${keyList.length} key(s)\n`));
  if (!includeDisabled) {
    console.error(
      chalk.blue(
        "TIP: use `--include-disabled` to include disabled keys as well."
      )
    );
  }

  const format = validateFormat(options.format || "table");
  await outputKeyList(keyList, format, options.output);
}
