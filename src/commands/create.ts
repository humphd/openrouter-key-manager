import chalk from "chalk";
import { OpenRouterClient } from "../lib/api-client.js";
import {
  generateKeyName,
  generateOutputFilename,
} from "../lib/key-formatter.js";
import { outputCreatedKeys } from "../lib/output-formatter.js";
import {
  validateEmail,
  validateTags,
  validateDate,
  validateLimit,
} from "../lib/validators.js";
import { getProvisioningKey, getTodayDate } from "../utils/config.js";
import type { KeyInfo } from "../types.js";

interface CreateOptions {
  limit: number;
  email: string;
  tags?: string[];
  date?: string;
  output?: string;
}

interface GlobalOptions {
  provisioningKey?: string;
}

export async function createCommand(
  options: CreateOptions,
  globalOptions: GlobalOptions,
): Promise<void> {
  try {
    const provisioningKey = getProvisioningKey(globalOptions.provisioningKey);

    validateEmail(options.email);
    const tags = options.tags || [];
    validateTags(tags);
    validateLimit(options.limit);
    const date = options.date || getTodayDate();
    validateDate(date);

    const client = new OpenRouterClient(provisioningKey);
    const keyName = generateKeyName(options.email, tags, date);
    const { key: apiKey, hash } = await client.createKey(
      keyName,
      options.limit,
    );

    console.error(chalk.green(`✓ Created key for ${options.email}`));

    const result: KeyInfo[] = [
      {
        email: options.email,
        tags,
        issuedDate: date,
        keyName,
        apiKey,
        hash,
      },
    ];

    const csvFile =
      options.output || generateOutputFilename(options.email, tags, date);
    await outputCreatedKeys(result, csvFile);
    console.error(chalk.blue(`CSV output saved to: ${csvFile}`));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`✗ Failed to create key: ${errorMessage}`));
    throw error;
  }
}
