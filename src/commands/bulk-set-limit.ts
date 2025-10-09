import chalk from "chalk";
import inquirer from "inquirer";
import { OpenRouterClient } from "../lib/api-client.js";
import { parseKeyFile } from "../lib/file-parser.js";
import { validateLimit } from "../lib/validators.js";
import { getProvisioningKey } from "../utils/config.js";

interface BulkSetLimitOptions {
  limit: number;
  delimiter?: string;
  skipHeader?: boolean;
  confirm?: boolean;
}

interface GlobalOptions {
  provisioningKey?: string;
}

export async function bulkSetLimitCommand(
  filePath: string,
  options: BulkSetLimitOptions,
  globalOptions: GlobalOptions
): Promise<void> {
  const provisioningKey = getProvisioningKey(globalOptions.provisioningKey);

  validateLimit(options.limit);

  // Parse key file (only needs name and hash)
  const keys = await parseKeyFile(
    filePath,
    options.delimiter,
    options.skipHeader ?? true
  );

  console.error(chalk.blue(`Found ${keys.length} key(s) in ${filePath}\n`));

  // Confirm limit change
  if (!options.confirm) {
    console.error(
      chalk.yellow(
        `\nAbout to set limit to $${options.limit.toFixed(2)} for ${keys.length} key(s):`
      )
    );
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
        message: "Proceed with limit change?",
        default: false,
      },
    ]);

    if (!answer.confirm) {
      console.error(chalk.yellow("Operation cancelled"));
      return;
    }
  }

  // Update limits using hash
  const client = new OpenRouterClient(provisioningKey);

  const updated: string[] = [];
  const errors: Array<{ key: string; error: string }> = [];

  for (const key of keys) {
    try {
      await client.setKeyLimit(key.hash, options.limit);
      updated.push(key.name);
      console.error(
        chalk.green(
          `✓ Updated limit for ${key.name} to $${options.limit.toFixed(2)}`
        )
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      errors.push({
        key: key.name,
        error: errorMessage,
      });
      console.error(
        chalk.red(`✗ Failed to update ${key.name}: ${errorMessage}`)
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
