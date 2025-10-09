import chalk from "chalk";
import inquirer from "inquirer";
import { minimatch } from "minimatch";
import { OpenRouterClient } from "../lib/api-client.js";
import { validateLimit } from "../lib/validators.js";
import { getProvisioningKey } from "../utils/config.js";

interface SetLimitOptions {
  pattern?: string;
  hash?: string;
  limit: number;
  confirm?: boolean;
}

interface GlobalOptions {
  provisioningKey?: string;
}

export async function setLimitCommand(
  options: SetLimitOptions,
  globalOptions: GlobalOptions,
): Promise<void> {
  const provisioningKey = getProvisioningKey(globalOptions.provisioningKey);
  const client = new OpenRouterClient(provisioningKey);

  // Validate that only one of pattern or hash is provided
  if (options.pattern && options.hash) {
    throw new Error("Cannot specify both --pattern and --hash. Choose one.");
  }

  if (!options.pattern && !options.hash) {
    throw new Error("Either --pattern or --hash must be provided");
  }

  validateLimit(options.limit);

  // Get all keys
  const allKeys = await client.listKeys(true);
  let keysToModify = allKeys;

  // Filter by hash if provided
  if (options.hash) {
    keysToModify = allKeys.filter((k) => k.hash === options.hash);
    if (keysToModify.length === 0) {
      throw new Error(`No key found with hash: ${options.hash}`);
    }
  }
  // Filter by pattern if provided
  else if (options.pattern) {
    keysToModify = allKeys.filter((k) => minimatch(k.name, options.pattern!));
    if (keysToModify.length === 0) {
      throw new Error(`No keys match pattern: ${options.pattern}`);
    }
  }

  // Confirm if multiple keys or no --confirm flag
  if (!options.confirm && keysToModify.length > 0) {
    console.error(
      chalk.yellow(
        `\nAbout to set limit to $${options.limit.toFixed(2)} for ${keysToModify.length} key(s):`,
      ),
    );
    for (const key of keysToModify.slice(0, 5)) {
      const currentLimit = key.limit ?? 0;
      console.error(
        `  - ${key.name} (current: $${currentLimit.toFixed(2)} → new: $${options.limit.toFixed(2)})`,
      );
    }
    if (keysToModify.length > 5) {
      console.error(chalk.gray(`  ... and ${keysToModify.length - 5} more`));
    }

    const answer = await inquirer.prompt([
      {
        type: "confirm",
        name: "confirm",
        message: "Proceed with limit change?",
        default: false,
      },
    ]);

    if (!answer.confirm) {
      console.error(chalk.yellow("Operation cancelled"));
      return;
    }
  }

  // Update limits
  const updated: string[] = [];
  const errors: Array<{ keyName: string; error: string }> = [];

  for (const key of keysToModify) {
    try {
      await client.setKeyLimit(key.hash, options.limit);
      updated.push(key.name);
      console.error(
        chalk.green(
          `✓ Updated limit for ${key.name} to $${options.limit.toFixed(2)}`,
        ),
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      errors.push({
        keyName: key.name,
        error: errorMessage,
      });
      console.error(
        chalk.red(`✗ Failed to update limit for ${key.name}: ${errorMessage}`),
      );
    }
  }

  // Report results
  console.error(chalk.blue(`\n${updated.length} key(s) updated successfully`));

  if (errors.length > 0) {
    console.error(chalk.red(`${errors.length} key(s) failed to update`));
    process.exit(1);
  }
}
