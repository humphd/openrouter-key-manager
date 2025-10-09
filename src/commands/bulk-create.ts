import chalk from "chalk";
import { OpenRouterClient } from "../lib/api-client.js";
import { parseAccountList } from "../lib/file-parser.js";
import {
  generateKeyName,
  generateOutputFilename,
} from "../lib/key-formatter.js";
import { outputCreatedKeys } from "../lib/output-formatter.js";
import { validateDate, validateLimit } from "../lib/validators.js";
import { getProvisioningKey, getTodayDate } from "../utils/config.js";
import type { KeyInfo, AccountRecord } from "../types.js";

interface BulkCreateOptions {
  limit: number;
  date?: string;
  delimiter?: string;
  skipHeader?: boolean;
  output?: string;
}

interface GlobalOptions {
  provisioningKey?: string;
}

export async function bulkCreateCommand(
  filePath: string,
  options: BulkCreateOptions,
  globalOptions: GlobalOptions,
): Promise<void> {
  const provisioningKey = getProvisioningKey(globalOptions.provisioningKey);

  validateLimit(options.limit);
  const date = options.date || getTodayDate();
  validateDate(date);

  // Parse account list
  const accounts = await parseAccountList(
    filePath,
    options.delimiter,
    options.skipHeader ?? true,
  );

  console.error(
    chalk.blue(`Found ${accounts.length} account(s) in ${filePath}\n`),
  );

  const client = new OpenRouterClient(provisioningKey);
  const results: KeyInfo[] = [];
  const errors: Array<{ account: AccountRecord; error: string }> = [];

  for (const account of accounts) {
    try {
      const keyName = generateKeyName(account.email, account.tags, date);

      const { key: apiKey, hash } = await client.createKey(
        keyName,
        options.limit,
      );

      results.push({
        email: account.email,
        tags: account.tags,
        issuedDate: date,
        keyName,
        apiKey,
        hash,
      });

      console.error(chalk.green(`✓ Created key for ${account.email}`));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      errors.push({
        account,
        error: errorMessage,
      });
      console.error(
        chalk.red(
          `✗ Failed to create key for ${account.email}: ${errorMessage}`,
        ),
      );
    }
  }

  // Output results
  if (results.length > 0) {
    console.error(
      chalk.blue(`\n${results.length} key(s) created successfully\n`),
    );

    const allTags = new Set<string>();
    results.forEach((r) => r.tags.forEach((t) => allTags.add(t)));
    const csvFile =
      options.output || generateOutputFilename(null, Array.from(allTags), date);
    await outputCreatedKeys(results, csvFile);
    console.error(chalk.blue(`CSV output saved to: ${csvFile}`));
  }

  // Report all errors
  if (errors.length > 0) {
    console.error(chalk.red(`\n${errors.length} key(s) failed to create`));
  }

  if (errors.length > 0 && results.length === 0) {
    process.exit(1);
  }
}
