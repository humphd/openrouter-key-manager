import chalk from "chalk";
import inquirer from "inquirer";
import { OpenRouterClient } from "../lib/api-client.js";
import { parseKeyFile } from "../lib/file-parser.js";
import { getProvisioningKey } from "../utils/config.js";

interface BulkDeleteOptions {
  delimiter?: string;
  skipHeader?: boolean;
  confirm?: boolean;
}

interface GlobalOptions {
  provisioningKey?: string;
}

export async function bulkDeleteCommand(
  filePath: string,
  options: BulkDeleteOptions,
  globalOptions: GlobalOptions
): Promise<void> {
  const provisioningKey = getProvisioningKey(globalOptions.provisioningKey);

  // Parse key file (only needs name and hash)
  const keys = await parseKeyFile(
    filePath,
    options.delimiter,
    options.skipHeader ?? true
  );

  console.error(chalk.blue(`Found ${keys.length} key(s) in ${filePath}\n`));

  // Confirm deletion
  if (!options.confirm) {
    console.error(chalk.yellow(`\nAbout to delete ${keys.length} key(s):`));
    for (const key of keys.slice(0, 5)) {
      console.error(`  - ${key.name} (${key.hash})`);
    }

    if (keys.length > 5) {
      console.error(chalk.gray(`  ... and ${keys.length - 5} more`));
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

  // Delete keys using hash (more reliable than name)
  const client = new OpenRouterClient(provisioningKey);

  const deleted: string[] = [];
  const errors: Array<{ key: string; error: string }> = [];

  for (const key of keys) {
    try {
      await client.deleteKeyByHash(key.hash);
      deleted.push(key.name);
      console.error(chalk.green(`✓ Deleted: ${key.name}`));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      errors.push({
        key: key.name,
        error: errorMessage,
      });
      console.error(
        chalk.red(`✗ Failed to delete ${key.name}: ${errorMessage}`)
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
