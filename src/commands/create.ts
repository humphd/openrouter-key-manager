import chalk from "chalk";
import { OpenRouterClient } from "../lib/api-client.js";
import { generateEmail, generateKeyName } from "../lib/key-formatter.js";
import { outputResult } from "../lib/output-formatter.js";
import {
  validateEmail,
  validateUsername,
  validateStudentId,
  validateCourse,
  validateDate,
  validateLimit,
  validateFormat,
} from "../lib/validators.js";
import {
  getProvisioningKey,
  getEmailDomain,
  getTodayDate,
} from "../utils/config.js";
import type { KeyRecord } from "../types.js";

interface CreateOptions {
  limit: number;
  username?: string;
  email?: string;
  studentId: string;
  course: string;
  date?: string;
  format?: string;
  output?: string;
}

interface GlobalOptions {
  provisioningKey?: string;
  emailDomain?: string;
}

export async function createCommand(
  options: CreateOptions,
  globalOptions: GlobalOptions
): Promise<void> {
  try {
    // Get provisioning key
    const provisioningKey = getProvisioningKey(globalOptions.provisioningKey);

    // Validate inputs
    validateStudentId(options.studentId);
    validateCourse(options.course);
    validateLimit(options.limit);

    // Determine email
    const emailDomain = getEmailDomain(globalOptions.emailDomain);
    let email: string;

    if (options.email) {
      validateEmail(options.email);
      email = options.email;
    } else if (options.username) {
      validateUsername(options.username);
      email = generateEmail(options.username, emailDomain);
    } else {
      throw new Error("Either --username or --email must be provided");
    }

    // Get or default date
    const date = options.date || getTodayDate();
    validateDate(date);

    // Generate key name
    const keyName = generateKeyName(
      email,
      options.studentId,
      options.course,
      date
    );

    // Create key via API
    const client = new OpenRouterClient(provisioningKey);
    const { key: apiKey, hash } = await client.createKey(
      keyName,
      options.limit
    );

    // Format result
    const result: KeyRecord[] = [
      {
        email,
        studentId: options.studentId,
        course: options.course,
        issuedDate: date,
        keyName,
        apiKey,
        hash,
      },
    ];

    // Output
    const format = validateFormat(options.format || "table");
    await outputResult(result, format, options.output);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`✗ Failed to create key: ${errorMessage}`));
  }
}
