import chalk from "chalk";
import inquirer from "inquirer";
import { minimatch } from "minimatch";
import { OpenRouterClient } from "../lib/api-client.js";
import { getProvisioningKey } from "../utils/config.js";

interface DisableOptions {
  pattern?: string;
  hash?: string;
  confirm?: boolean;
  enable?: boolean;
}

interface GlobalOptions {
  provisioningKey?: string;
}

export async function disableCommand(
  options: DisableOptions,
  globalOptions: GlobalOptions
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

  const action = options.enable ? "enable" : "disable";

  // Confirm if multiple keys or no --confirm flag
  if (!options.confirm && keysToModify.length > 0) {
    console.error(
      chalk.yellow(`\nAbout to ${action} ${keysToModify.length} key(s):`)
    );
    for (const key of keysToModify.slice(0, 5)) {
      console.error(`  - ${key.name} (${key.hash})`);
    }
    if (keysToModify.length > 5) {
      console.error(chalk.gray(`  ... and ${keysToModify.length - 5} more`));
    }

    const answer = await inquirer.prompt([
      {
        type: "confirm",
        name: "confirm",
        message: `Proceed with ${action}?`,
        default: false,
      },
    ]);

    if (!answer.confirm) {
      console.error(chalk.yellow(`${action} cancelled`));
      return;
    }
  }

  // Modify keys
  const modified: string[] = [];
  const errors: Array<{ keyName: string; error: string }> = [];

  for (const key of keysToModify) {
    try {
      if (options.enable) {
        await client.enableKey(key.hash);
      } else {
        await client.disableKey(key.hash);
      }
      modified.push(key.name);
      console.error(
        chalk.green(
          `✓ ${action.charAt(0).toUpperCase() + action.slice(1)}d: ${key.name}`
        )
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      errors.push({
        keyName: key.name,
        error: errorMessage,
      });
      console.error(
        chalk.red(`✗ Failed to ${action} ${key.name}: ${errorMessage}`)
      );
    }
  }

  // Report results
  console.error(
    chalk.blue(`\n${modified.length} key(s) ${action}d successfully`)
  );

  if (errors.length > 0) {
    console.error(chalk.red(`${errors.length} key(s) failed to ${action}`));
    process.exit(1);
  }
}
