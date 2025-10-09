import chalk from "chalk";
import inquirer from "inquirer";
import { minimatch } from "minimatch";
import { OpenRouterClient } from "../lib/api-client.js";
import { getProvisioningKey } from "../utils/config.js";

interface DeleteOptions {
  pattern?: string;
  hash?: string;
  confirm?: boolean;
}

interface GlobalOptions {
  provisioningKey?: string;
}

export async function deleteCommand(
  options: DeleteOptions,
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

  // Get all keys
  const allKeys = await client.listKeys(true);
  let keysToDelete = allKeys;

  // Filter by hash if provided
  if (options.hash) {
    keysToDelete = allKeys.filter((k) => k.hash === options.hash);
    if (keysToDelete.length === 0) {
      throw new Error(`No key found with hash: ${options.hash}`);
    }
  }
  // Filter by pattern if provided
  else if (options.pattern) {
    keysToDelete = allKeys.filter((k) => minimatch(k.name, options.pattern!));
    if (keysToDelete.length === 0) {
      throw new Error(`No keys match pattern: ${options.pattern}`);
    }
  }

  // Confirm deletion if multiple keys or no --confirm flag
  if (!options.confirm && keysToDelete.length > 0) {
    console.error(
      chalk.yellow(`\nAbout to delete ${keysToDelete.length} key(s):`),
    );
    for (const key of keysToDelete.slice(0, 5)) {
      console.error(`  - ${key.name} (${key.hash})`);
    }
    if (keysToDelete.length > 5) {
      console.error(chalk.gray(`  ... and ${keysToDelete.length - 5} more`));
    }

    const answer = await inquirer.prompt([
      {
        type: "confirm",
        name: "confirm",
        message: "Proceed with deletion?",
        default: false,
      },
    ]);

    if (!answer.confirm) {
      console.error(chalk.yellow("Deletion cancelled"));
      return;
    }
  }

  // Delete keys
  const deleted: string[] = [];
  const errors: Array<{ keyName: string; error: string }> = [];

  for (const key of keysToDelete) {
    try {
      await client.deleteKeyByHash(key.hash);
      deleted.push(key.name);
      console.error(chalk.green(`✓ Deleted: ${key.name}`));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      errors.push({
        keyName: key.name,
        error: errorMessage,
      });
      console.error(
        chalk.red(`✗ Failed to delete ${key.name}: ${errorMessage}`),
      );
    }
  }

  // Report results
  console.error(chalk.blue(`\n${deleted.length} key(s) deleted successfully`));

  if (errors.length > 0) {
    console.error(chalk.red(`${errors.length} key(s) failed to delete`));
    process.exit(1);
  }
}
