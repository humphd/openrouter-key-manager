import { OpenRouterClient } from "../lib/api-client.js";
import { parseAccountList } from "../lib/file-parser.js";
import { generateKeyName } from "../lib/key-formatter.js";
import { validateDate, validateLimit } from "../lib/validators.js";
import { getTodayDate } from "../utils/config.js";
import type { KeyInfo, AccountRecord, GlobalOptions } from "../types.js";

export interface BulkCreateOptions extends GlobalOptions {
  provisioningKey: string;
  limit: number;
  date?: string;
  delimiter?: string;
  skipHeader?: boolean;
  output?: string;
}

export interface BulkCreateResult {
  created: KeyInfo[];
  errors: Array<{ account: AccountRecord; error: string }>;
  date: string;
  tags: string[];
}

export async function bulkCreate(
  filePath: string,
  options: BulkCreateOptions,
): Promise<BulkCreateResult> {
  validateLimit(options.limit);
  const date = options.date || getTodayDate();
  validateDate(date);

  const accounts = await parseAccountList(
    filePath,
    options.delimiter,
    options.skipHeader ?? true,
  );

  const client = new OpenRouterClient(options.provisioningKey);
  const created: KeyInfo[] = [];
  const errors: Array<{ account: AccountRecord; error: string }> = [];

  for (const account of accounts) {
    try {
      const keyName = generateKeyName(account.email, account.tags, date);
      const { key: apiKey, hash } = await client.createKey(
        keyName,
        options.limit,
      );

      created.push({
        email: account.email,
        tags: account.tags,
        issuedDate: date,
        keyName,
        apiKey,
        hash,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      errors.push({ account, error: errorMessage });
    }
  }

  const allTags = new Set<string>();
  created.forEach((r) => r.tags.forEach((t) => allTags.add(t)));

  return {
    created,
    errors,
    date,
    tags: Array.from(allTags),
  };
}
