import chalk from "chalk";
import inquirer from "inquirer";
import { OpenRouterClient } from "../lib/api-client.js";
import { parseStudentRoster, parseKeyFile } from "../lib/file-parser.js";
import { generateEmail, generateKeyName } from "../lib/key-formatter.js";
import { validateCourse, validateDate } from "../lib/validators.js";
import { getProvisioningKey, getEmailDomain } from "../utils/config.js";

interface BulkDeleteOptions {
  course?: string;
  date?: string;
  delimiter?: string;
  skipHeader?: boolean;
  confirm?: boolean;
}

interface GlobalOptions {
  provisioningKey?: string;
  emailDomain?: string;
}

export async function bulkDeleteCommand(
  filePath: string,
  options: BulkDeleteOptions,
  globalOptions: GlobalOptions
): Promise<void> {
  // Get provisioning key
  const provisioningKey = getProvisioningKey(globalOptions.provisioningKey);

  // Determine file type and parse
  const keyNames: string[] = [];

  try {
    // Try parsing as key file first
    const keys = await parseKeyFile(
      filePath,
      options.delimiter,
      options.skipHeader ?? true
    );

    for (const key of keys) {
      keyNames.push(key.keyName);
    }
  } catch {
    // Parse as student roster
    if (!options.course || !options.date) {
      throw new Error(
        "When using student roster file, --course and --date " + "are required"
      );
    }

    validateCourse(options.course);
    validateDate(options.date);

    const students = await parseStudentRoster(
      filePath,
      options.delimiter,
      options.skipHeader ?? true
    );

    const emailDomain = getEmailDomain(globalOptions.emailDomain);

    for (const student of students) {
      const email = generateEmail(student.username, emailDomain);
      const keyName = generateKeyName(
        email,
        student.studentId,
        options.course,
        options.date
      );
      keyNames.push(keyName);
    }
  }

  // Confirm deletion
  if (!options.confirm) {
    console.error(chalk.yellow(`\nAbout to delete ${keyNames.length} key(s):`));
    for (const keyName of keyNames.slice(0, 5)) {
      console.error(`  - ${keyName}`);
    }

    if (keyNames.length > 5) {
      console.error(chalk.gray(`  ... and ${keyNames.length - 5} more`));
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

  // Delete keys
  const client = new OpenRouterClient(provisioningKey);

  const deleted: string[] = [];
  const errors: Array<{ keyName: string; error: string }> = [];

  for (const keyName of keyNames) {
    try {
      await client.deleteKey(keyName);
      deleted.push(keyName);
      console.error(chalk.green(`✓ Deleted: ${keyName}`));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      errors.push({
        keyName,
        error: errorMessage,
      });
      console.error(
        chalk.red(`✗ Failed to delete ${keyName}: ${errorMessage}`)
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
