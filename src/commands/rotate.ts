import chalk from "chalk";
import inquirer from "inquirer";
import { minimatch } from "minimatch";
import { OpenRouterClient } from "../lib/api-client.js";
import { outputCreatedKeys } from "../lib/output-formatter.js";
import { generateOutputFilename } from "../lib/key-formatter.js";
import { getProvisioningKey, getTodayDate } from "../utils/config.js";
import type { KeyInfo } from "../types.js";

interface RotateOptions {
  pattern?: string;
  hash?: string;
  confirm?: boolean;
  output?: string;
}

interface GlobalOptions {
  provisioningKey?: string;
}

export async function rotateCommand(
  options: RotateOptions,
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
  let keysToRotate = allKeys;

  // Filter by hash if provided
  if (options.hash) {
    keysToRotate = allKeys.filter((k) => k.hash === options.hash);
    if (keysToRotate.length === 0) {
      throw new Error(`No key found with hash: ${options.hash}`);
    }
  }
  // Filter by pattern if provided
  else if (options.pattern) {
    keysToRotate = allKeys.filter((k) => minimatch(k.name, options.pattern!));
    if (keysToRotate.length === 0) {
      throw new Error(`No keys match pattern: ${options.pattern}`);
    }
  }

  // Confirm rotation
  if (!options.confirm && keysToRotate.length > 0) {
    console.error(
      chalk.yellow(
        `\nAbout to rotate ${keysToRotate.length} key(s) (delete old, create new):`,
      ),
    );
    for (const key of keysToRotate.slice(0, 5)) {
      console.error(`  - ${key.name} (limit: $${(key.limit ?? 0).toFixed(2)})`);
    }
    if (keysToRotate.length > 5) {
      console.error(chalk.gray(`  ... and ${keysToRotate.length - 5} more`));
    }

    console.error(
      chalk.yellow(
        "\nWARNING: Old keys will be deleted and new keys will be generated.",
      ),
    );
    console.error(
      chalk.yellow("Users will need to update to the new API keys."),
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

  // Rotate keys: GET details → DELETE old → CREATE new
  const rotated: KeyInfo[] = [];
  const errors: Array<{ keyName: string; error: string }> = [];

  for (const oldKey of keysToRotate) {
    try {
      // Get full key details (in case we need them)
      const keyDetails = await client.getKey(oldKey.hash);

      // Delete old key
      await client.deleteKeyByHash(oldKey.hash);

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

      console.error(chalk.green(`✓ Rotated: ${keyDetails.name}`));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      errors.push({
        keyName: oldKey.name,
        error: errorMessage,
      });
      console.error(
        chalk.red(`✗ Failed to rotate ${oldKey.name}: ${errorMessage}`),
      );
    }
  }

  // Output new keys
  if (rotated.length > 0) {
    console.error(
      chalk.blue(`\n${rotated.length} key(s) rotated successfully\n`),
    );

    const csvFile =
      options.output ||
      generateOutputFilename(null, ["rotated"], getTodayDate());
    await outputCreatedKeys(rotated, csvFile);
    console.error(chalk.blue(`New keys saved to: ${csvFile}`));
    console.error(
      chalk.yellow(
        "\nIMPORTANT: Distribute new keys to users. Old keys are no longer valid.",
      ),
    );
  }

  // Report errors
  if (errors.length > 0) {
    console.error(chalk.red(`\n${errors.length} key(s) failed to rotate`));
    process.exit(1);
  }
}
