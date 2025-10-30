import chalk from "chalk";
import { OpenRouterClient } from "../lib/api-client.js";
import { generateKeyName } from "../lib/key-formatter.js";
import {
  validateEmail,
  validateTags,
  validateDate,
  validateLimit,
} from "../lib/validators.js";
import { getProvisioningKey, getTodayDate } from "../utils/config.js";
import type { GlobalOptions, KeyInfo } from "../types.js";

export interface CreateOptions extends GlobalOptions {
  limit: number;
  email: string;
  tags?: string[];
  date?: string;
  output?: string;
}

export interface CreateResult extends KeyInfo {}

export async function create(options: CreateOptions): Promise<CreateResult> {
  const provisioningKey = getProvisioningKey(options.provisioningKey);

  validateEmail(options.email);
  const tags = options.tags || [];
  validateTags(tags);
  validateLimit(options.limit);
  const date = options.date || getTodayDate();
  validateDate(date);

  const client = new OpenRouterClient(provisioningKey);
  const keyName = generateKeyName(options.email, tags, date);
  const { key: apiKey, hash } = await client.createKey(keyName, options.limit);

  console.error(chalk.green(`✓ Created key for ${options.email}`));

  return {
    email: options.email,
    tags,
    issuedDate: date,
    keyName,
    apiKey,
    hash,
  };
}
