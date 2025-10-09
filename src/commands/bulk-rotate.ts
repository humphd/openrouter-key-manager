import chalk from "chalk";
import inquirer from "inquirer";
import { OpenRouterClient } from "../lib/api-client.js";
import { parseKeyFile } from "../lib/file-parser.js";
import { outputCreatedKeys } from "../lib/output-formatter.js";
import { generateOutputFilename } from "../lib/key-formatter.js";
import { getProvisioningKey, getTodayDate } from "../utils/config.js";
import type { KeyInfo } from "../types.js";

interface BulkRotateOptions {
  delimiter?: string;
  skipHeader?: boolean;
  confirm?: boolean;
  output?: string;
}

interface GlobalOptions {
  provisioningKey?: string;
}

export async function bulkRotateCommand(
  filePath: string,
  options: BulkRotateOptions,
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

  // Confirm rotation
  if (!options.confirm) {
    console.error(
      chalk.yellow(
        `\nAbout to rotate ${keys.length} key(s) (delete old, create new):`
      )
    );
    for (const key of keys.slice(0, 5)) {
      console.error(`  - ${key.name} (${key.hash})`);
    }

    if (keys.length > 5) {
      console.error(chalk.gray(`  ... and ${keys.length - 5} more`));
    }

    console.error(
      chalk.yellow(
        "\nWARNING: Old keys will be deleted and new keys will be generated."
      )
    );
    console.error(
      chalk.yellow("Users will need to update to the new API keys.")
    );

    const answer = await inquirer.prompt([
      {
        type: "confirm",
        name: "confirm",
        message: "Proceed with rotation?",
        default: false,
      },
    ]);

    if (!answer.confirm) {
      console.error(chalk.yellow("Rotation cancelled"));
      return;
    }
  }

  // Rotate keys using hash
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

      console.error(chalk.green(`✓ Rotated: ${keyDetails.name}`));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      errors.push({
        key: key.name,
        error: errorMessage,
      });
      console.error(
        chalk.red(`✗ Failed to rotate ${key.name}: ${errorMessage}`)
      );
    }
  }

  // Output new keys
  if (rotated.length > 0) {
    console.error(
      chalk.blue(`\n${rotated.length} key(s) rotated successfully\n`)
    );

    const csvFile =
      options.output ||
      generateOutputFilename(null, ["rotated"], getTodayDate());
    await outputCreatedKeys(rotated, csvFile);
    console.error(chalk.blue(`New keys saved to: ${csvFile}`));
    console.error(
      chalk.yellow(
        "\nIMPORTANT: Distribute new keys to users. Old keys are no longer valid."
      )
    );
  }

  // Report errors
  if (errors.length > 0) {
    console.error(chalk.red(`\n${errors.length} key(s) failed to rotate`));
    process.exit(1);
  }
}
