import chalk from "chalk";
import { OpenRouterClient } from "../lib/api-client.js";
import { parseStudentRoster } from "../lib/file-parser.js";
import { generateEmail, generateKeyName } from "../lib/key-formatter.js";
import { outputResult } from "../lib/output-formatter.js";
import {
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
import type { KeyRecord, StudentRecord } from "../types.js";

interface BulkCreateOptions {
  limit: number;
  course: string;
  date?: string;
  delimiter?: string;
  skipHeader?: boolean;
  format?: string;
  output?: string;
}

interface GlobalOptions {
  provisioningKey?: string;
  emailDomain?: string;
}

export async function bulkCreateCommand(
  filePath: string,
  options: BulkCreateOptions,
  globalOptions: GlobalOptions
): Promise<void> {
  // Get provisioning key
  const provisioningKey = getProvisioningKey(globalOptions.provisioningKey);

  // Validate inputs
  validateCourse(options.course);
  validateLimit(options.limit);

  // Parse student roster
  const students = await parseStudentRoster(
    filePath,
    options.delimiter,
    options.skipHeader ?? true
  );

  console.error(chalk.blue(`Found ${students.length} student(s) in roster\n`));

  // Get email domain and date
  const emailDomain = getEmailDomain(globalOptions.emailDomain);
  const date = options.date || getTodayDate();
  validateDate(date);

  // Create API client
  const client = new OpenRouterClient(provisioningKey);

  // Create keys for each student
  const results: KeyRecord[] = [];
  const errors: Array<{ student: StudentRecord; error: string }> = [];

  for (const student of students) {
    try {
      const email = generateEmail(student.username, emailDomain);
      const keyName = generateKeyName(
        email,
        student.studentId,
        options.course,
        date
      );

      const { key: apiKey, hash } = await client.createKey(
        keyName,
        options.limit
      );

      results.push({
        email,
        studentId: student.studentId,
        course: options.course,
        issuedDate: date,
        keyName,
        apiKey,
        hash,
      });

      console.error(chalk.green(`✓ Created key for ${email}`));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      errors.push({
        student,
        error: errorMessage,
      });
      console.error(
        chalk.red(
          `✗ Failed to create key for ${student.username}: ` + `${errorMessage}`
        )
      );
    }
  }

  // Output results
  if (results.length > 0) {
    console.error(
      chalk.blue(`\n${results.length} key(s) created successfully\n`)
    );
    const format = validateFormat(options.format || "table");
    await outputResult(results, format, options.output);
  }

  // Report errors
  if (errors.length > 0) {
    console.error(chalk.red(`\n${errors.length} key(s) failed to create`));
  }

  // Exit with appropriate code
  if (errors.length > 0 && results.length === 0) {
    process.exit(1);
  }
}
