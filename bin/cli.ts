#!/usr/bin/env node

import { Command } from "commander";
import inquirer from "inquirer";
import chalk from "chalk";
import { writeFile } from "node:fs/promises";

import {
  create,
  bulkCreate,
  destroy,
  bulkDestroy,
  list,
  disable,
  report,
  setLimit,
  bulkSetLimit,
  rotate,
  bulkRotate,
  enable,
  generateOutputFilename,
  outputCreatedKeys,
  outputKeyList,
  getTodayDate,
  validateFormat,
  getSelectedKeys,
  parseKeyFile,
  getDefaultReportFilename,
} from "../src/index.js";
import type {
  CreateOptions,
  BulkCreateOptions,
  DestroyOptions,
  BulkDestroyOptions,
  ListOptions,
  DisableOptions,
  ReportOptions,
  SetLimitOptions,
  BulkSetLimitOptions,
  RotateOptions,
  BulkRotateOptions,
  EnableOptions,
  GlobalOptions,
} from "../src/index.js";

import packageJson from "../package.json" with { type: "json" };
const { version } = packageJson;

function mergeOptions<T>(
  commandOptions: T,
  globalOptions: GlobalOptions,
): T & GlobalOptions {
  return { ...commandOptions, ...globalOptions };
}

function handleCommandError(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  console.error(chalk.red(`Error: ${message}`));
  process.exit(1);
}

async function confirmAction(
  action: string,
  keys: Array<{ name: string; hash: string }>,
  extraWarning?: string,
): Promise<boolean> {
  console.error(chalk.yellow(`\nAbout to ${action} ${keys.length} key(s):`));

  for (const key of keys.slice(0, 5)) {
    console.error(`  - ${key.name} (${key.hash})`);
  }

  if (keys.length > 5) {
    console.error(chalk.gray(`  ... and ${keys.length - 5} more`));
  }

  if (extraWarning) {
    console.error(chalk.yellow(`\n${extraWarning}`));
  }

  const answer = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirm",
      message: `Proceed with ${action}?`,
      default: false,
    },
  ]);

  if (!answer.confirm) {
    console.error(chalk.yellow(`${action} cancelled`));
    return false;
  }

  return true;
}

const program = new Command();

program
  .name("openrouter-key-manager")
  .description("Manage OpenRouter.ai API keys")
  .version(version)
  .option("-k, --provisioning-key <key>", "OpenRouter.ai API Provisioning Key");

// CREATE command
program
  .command("create")
  .description("Create an API key for a single account")
  .requiredOption(
    "-l, --limit <amount>",
    "Spending limit in US dollars",
    parseFloat,
  )
  .requiredOption("-e, --email <email>", "Email address")
  .option("-t, --tags <tags...>", "Tags (space-separated)")
  .option("-d, --date <date>", "Issue date (YYYY-MM-DD, default today)")
  .option("-o, --output <file>", "CSV output file (default: auto-generated)")
  .action(async (options) => {
    try {
      const opts = mergeOptions<CreateOptions>(options, program.opts());
      const result = await create(opts);
      const csvFile =
        opts.output ||
        generateOutputFilename(opts.email, result.tags, result.issuedDate);
      await outputCreatedKeys([result], csvFile);
      console.error(chalk.blue(`CSV output saved to: ${csvFile}`));
    } catch (error) {
      handleCommandError(error);
    }
  });

// BULK-CREATE command
program
  .command("bulk-create")
  .description("Create API keys for multiple accounts")
  .argument("<file>", "CSV/TSV file with account information")
  .requiredOption(
    "-l, --limit <amount>",
    "Spending limit in US dollars",
    parseFloat,
  )
  .option("-d, --date <date>", "Issue date (YYYY-MM-DD, default today)")
  .option("--delimiter <char>", "Field delimiter")
  .option("--skip-header [boolean]", "Skip first row", true)
  .option("-o, --output <file>", "CSV output file (default: auto-generated)")
  .action(async (file, options) => {
    try {
      const opts = mergeOptions<BulkCreateOptions>(options, program.opts());
      const result = await bulkCreate(file, opts);

      console.error(
        chalk.blue(
          `Found ${result.created.length + result.errors.length} ` +
            `account(s) in ${file}\n`,
        ),
      );

      // Display progress
      for (const key of result.created) {
        console.error(chalk.green(`✓ Created key for ${key.email}`));
      }
      for (const { account, error } of result.errors) {
        console.error(
          chalk.red(`✗ Failed to create key for ${account.email}: ${error}`),
        );
      }

      // Output CSV
      if (result.created.length > 0) {
        console.error(
          chalk.blue(
            `\n${result.created.length} key(s) created ` + `successfully\n`,
          ),
        );

        const csvFile =
          opts.output || generateOutputFilename(null, result.tags, result.date);
        await outputCreatedKeys(result.created, csvFile);
        console.error(chalk.blue(`CSV output saved to: ${csvFile}`));
      }

      if (result.errors.length > 0) {
        console.error(
          chalk.red(`\n${result.errors.length} key(s) failed to create`),
        );
      }

      if (result.errors.length > 0 && result.created.length === 0) {
        process.exit(1);
      }
    } catch (error) {
      handleCommandError(error);
    }
  });

// LIST command
program
  .command("list")
  .description("List API keys with usage information")
  .option("-p, --pattern <pattern>", "Filter by glob pattern")
  .option("--include-disabled", "Include disabled keys (default false)")
  .option("-f, --format <format>", "Output format (table, json, csv)", "table")
  .option("-o, --output <file>", "Output file")
  .option("--full", "Show full name and hash (default: truncated)")
  .action(async (options) => {
    try {
      const opts = mergeOptions<ListOptions>(options, program.opts());
      const keyList = await list(opts);

      console.error(chalk.blue(`Found ${keyList.length} key(s)\n`));
      if (!opts.includeDisabled) {
        console.error(
          chalk.blue(
            "TIP: use `--include-disabled` to include disabled keys as well.",
          ),
        );
      }

      const format = validateFormat(opts.format || "table");
      await outputKeyList(keyList, format, opts.output, opts.full);
    } catch (error) {
      handleCommandError(error);
    }
  });

// DISABLE command
program
  .command("disable")
  .description("Disable API key(s)")
  .option("-p, --pattern <pattern>", "Filter by glob pattern")
  .option("--hash <hash>", "Key hash to disable")
  .option("-y, --confirm", "Skip confirmation prompt")
  .action(async (options) => {
    try {
      const opts = mergeOptions<DisableOptions>(options, program.opts());

      // Get selected keys if confirmation needed
      if (!opts.confirm) {
        const selectedKeys = await getSelectedKeys(opts);
        if (selectedKeys.length === 0) {
          console.error(chalk.yellow("No keys found to disable"));
          return;
        }

        const confirmed = await confirmAction("disable", selectedKeys);
        if (!confirmed) {
          return;
        }
      }

      const result = await disable(opts);

      // Display results
      for (const keyName of result.modified) {
        console.error(chalk.green(`✓ Disabled: ${keyName}`));
      }

      console.error(
        chalk.blue(`\n${result.modified.length} key(s) disabled successfully`),
      );

      if (result.errors.length > 0) {
        for (const { keyName, error } of result.errors) {
          console.error(chalk.red(`✗ Failed to disable ${keyName}: ${error}`));
        }
        console.error(
          chalk.red(`${result.errors.length} key(s) failed to disable`),
        );
        process.exit(1);
      }
    } catch (error) {
      handleCommandError(error);
    }
  });

// ENABLE command
program
  .command("enable")
  .description("Enable API key(s)")
  .option("-p, --pattern <pattern>", "Filter by glob pattern")
  .option("--hash <hash>", "Key hash to enable")
  .option("-y, --confirm", "Skip confirmation prompt")
  .action(async (options) => {
    try {
      const opts = mergeOptions<EnableOptions>(options, program.opts());

      // Get selected keys if confirmation needed
      if (!opts.confirm) {
        const selectedKeys = await getSelectedKeys(opts);
        if (selectedKeys.length === 0) {
          console.error(chalk.yellow("No keys found to enable"));
          return;
        }

        const confirmed = await confirmAction("enable", selectedKeys);
        if (!confirmed) {
          return;
        }
      }

      const result = await enable(opts);

      // Display results
      for (const keyName of result.modified) {
        console.error(chalk.green(`✓ Enabled: ${keyName}`));
      }

      console.error(
        chalk.blue(`\n${result.modified.length} key(s) enabled successfully`),
      );

      if (result.errors.length > 0) {
        for (const { keyName, error } of result.errors) {
          console.error(chalk.red(`✗ Failed to enable ${keyName}: ${error}`));
        }
        console.error(
          chalk.red(`${result.errors.length} key(s) failed to enable`),
        );
        process.exit(1);
      }
    } catch (error) {
      handleCommandError(error);
    }
  });

// DELETE/DESTROY command
program
  .command("delete")
  .alias("destroy")
  .description("Delete API key(s)")
  .option("-p, --pattern <pattern>", "Filter by glob pattern")
  .option("--hash <hash>", "Key hash to delete")
  .option("-y, --confirm", "Skip confirmation prompt")
  .action(async (options) => {
    try {
      const opts = mergeOptions<DestroyOptions>(options, program.opts());

      // Get preview if confirmation needed
      if (!opts.confirm) {
        const keysToDelete = await getSelectedKeys(opts);
        if (keysToDelete.length === 0) {
          console.error(chalk.yellow("No keys found to delete"));
          return;
        }

        const confirmed = await confirmAction("delete", keysToDelete);
        if (!confirmed) {
          return;
        }
      }

      const result = await destroy(opts);

      // Display results
      for (const keyName of result.deleted) {
        console.error(chalk.green(`✓ Deleted: ${keyName}`));
      }

      console.error(
        chalk.blue(`\n${result.deleted.length} key(s) deleted successfully`),
      );

      if (result.errors.length > 0) {
        for (const { keyName, error } of result.errors) {
          console.error(chalk.red(`✗ Failed to delete ${keyName}: ${error}`));
        }
        console.error(
          chalk.red(`${result.errors.length} key(s) failed to delete`),
        );
        process.exit(1);
      }
    } catch (error) {
      handleCommandError(error);
    }
  });

// BULK-DELETE/BULK-DESTROY command
program
  .command("bulk-delete")
  .alias("bulk-destroy")
  .description("Delete API keys for multiple accounts")
  .argument("<file>", "CSV/JSON file with key information (name,hash)")
  .option("--delimiter <char>", "Field delimiter")
  .option("--skip-header [boolean]", "Skip first row", true)
  .option("-y, --confirm", "Skip confirmation prompt")
  .action(async (file, options) => {
    try {
      const opts = mergeOptions<BulkDestroyOptions>(options, program.opts());

      // Get preview if confirmation needed
      if (!options.confirm) {
        const keysToDelete = await parseKeyFile(
          file,
          opts.delimiter,
          opts.skipHeader,
        );
        if (keysToDelete.length === 0) {
          console.error(chalk.yellow("No keys found to delete"));
          return;
        }
        console.error(
          chalk.blue(`Found ${keysToDelete.length} key(s) in ${file}\n`),
        );

        const confirmed = await confirmAction("delete", keysToDelete);
        if (!confirmed) {
          return;
        }
      }

      const result = await bulkDestroy(file, opts);

      // Display results
      for (const keyName of result.deleted) {
        console.error(chalk.green(`✓ Deleted: ${keyName}`));
      }

      console.error(
        chalk.blue(`\n${result.deleted.length} key(s) deleted successfully`),
      );

      if (result.errors.length > 0) {
        for (const { key, error } of result.errors) {
          console.error(chalk.red(`✗ Failed to delete ${key}: ${error}`));
        }
        console.error(
          chalk.red(`${result.errors.length} key(s) failed to delete`),
        );
        process.exit(1);
      }
    } catch (error) {
      handleCommandError(error);
    }
  });

// REPORT command
program
  .command("report")
  .description("Generate usage report as HTML")
  .option("-p, --pattern <pattern>", "Filter by glob pattern")
  .option("--include-disabled", "Include disabled keys (default false)")
  .option(
    "-o, --output <file>",
    "Output HTML file (default: report-YYYY-MM-DD.html)",
  )
  .action(async (options) => {
    try {
      const opts = mergeOptions<ReportOptions>(options, program.opts());

      console.error(chalk.blue("Generating report..."));

      const result = await report(opts);
      const outputFile = opts.output || getDefaultReportFilename();
      await writeFile(outputFile, result.html, "utf-8");

      console.error(
        chalk.blue(`Report generated for ${result.keyCount} key(s)`),
      );
      console.error(chalk.green(`✓ Report written to ${outputFile}`));
    } catch (error) {
      handleCommandError(error);
    }
  });

// SET-LIMIT command
program
  .command("set-limit")
  .description("Set spending limit for API key(s)")
  .requiredOption(
    "-l, --limit <amount>",
    "New spending limit in US dollars",
    parseFloat,
  )
  .option("-p, --pattern <pattern>", "Filter by glob pattern")
  .option("--hash <hash>", "Key hash to update")
  .option("-y, --confirm", "Skip confirmation prompt")
  .action(async (options) => {
    try {
      const opts = mergeOptions<SetLimitOptions>(options, program.opts());

      // Get preview if confirmation needed
      if (!opts.confirm) {
        const keysToModify = await getSelectedKeys(opts);
        if (keysToModify.length === 0) {
          console.error(chalk.yellow("No keys found to update"));
          return;
        }

        const confirmed = await confirmAction("update limit for", keysToModify);
        if (!confirmed) {
          return;
        }
      }

      const result = await setLimit(opts);

      // Display results
      for (const keyName of result.updated) {
        console.error(
          chalk.green(
            `✓ Updated limit for ${keyName} to $${opts.limit.toFixed(2)}`,
          ),
        );
      }

      console.error(
        chalk.blue(`\n${result.updated.length} key(s) updated successfully`),
      );

      if (result.errors.length > 0) {
        for (const { keyName, error } of result.errors) {
          console.error(
            chalk.red(`✗ Failed to update limit for ${keyName}: ${error}`),
          );
        }
        console.error(
          chalk.red(`${result.errors.length} key(s) failed to update`),
        );
        process.exit(1);
      }
    } catch (error) {
      handleCommandError(error);
    }
  });

// BULK-SET-LIMIT command
program
  .command("bulk-set-limit")
  .description("Set spending limit for multiple API keys")
  .argument("<file>", "CSV/JSON file with key information (name,hash)")
  .requiredOption(
    "-l, --limit <amount>",
    "New spending limit in US dollars",
    parseFloat,
  )
  .option("--delimiter <char>", "Field delimiter")
  .option("--skip-header [boolean]", "Skip first row", true)
  .option("-y, --confirm", "Skip confirmation prompt")
  .action(async (file, options) => {
    try {
      const opts = mergeOptions<BulkSetLimitOptions>(options, program.opts());

      // Get preview if confirmation needed
      if (!opts.confirm) {
        const keys = await parseKeyFile(file, opts.delimiter, opts.skipHeader);
        if (keys.length === 0) {
          console.error(chalk.yellow("No keys found to update"));
          return;
        }
        console.error(chalk.blue(`Found ${keys.length} key(s) in ${file}\n`));

        const confirmed = await confirmAction("update limit for", keys);
        if (!confirmed) {
          return;
        }
      }

      const result = await bulkSetLimit(file, opts);

      // Display results
      for (const keyName of result.updated) {
        console.error(
          chalk.green(
            `✓ Updated limit for ${keyName} to $${opts.limit.toFixed(2)}`,
          ),
        );
      }

      console.error(
        chalk.blue(`\n${result.updated.length} key(s) updated successfully`),
      );

      if (result.errors.length > 0) {
        for (const { key, error } of result.errors) {
          console.error(chalk.red(`✗ Failed to update ${key}: ${error}`));
        }
        console.error(
          chalk.red(`${result.errors.length} key(s) failed to update`),
        );
        process.exit(1);
      }
    } catch (error) {
      handleCommandError(error);
    }
  });

// ROTATE command
program
  .command("rotate")
  .description(
    "Rotate API key(s) (delete old, create new with same name/limit)",
  )
  .option("-p, --pattern <pattern>", "Filter by glob pattern")
  .option("--hash <hash>", "Key hash to rotate")
  .option("-y, --confirm", "Skip confirmation prompt")
  .option("-o, --output <file>", "CSV output file (default: auto-generated)")
  .action(async (options) => {
    try {
      const opts = mergeOptions<RotateOptions>(options, program.opts());

      // Get preview if confirmation needed
      if (!opts.confirm) {
        const keysToRotate = await getSelectedKeys(opts);
        if (keysToRotate.length === 0) {
          console.error(chalk.yellow("No keys found to rotate"));
          return;
        }

        const confirmed = await confirmAction("rotate", keysToRotate);
        if (!confirmed) {
          return;
        }
      }

      const result = await rotate(opts);

      // Display results
      for (const key of result.rotated) {
        console.error(chalk.green(`✓ Rotated: ${key.keyName}`));
      }

      // Output new keys
      if (result.rotated.length > 0) {
        console.error(
          chalk.blue(
            `\n${result.rotated.length} key(s) rotated successfully\n`,
          ),
        );

        const csvFile =
          opts.output ||
          generateOutputFilename(null, ["rotated"], getTodayDate());
        await outputCreatedKeys(result.rotated, csvFile);
        console.error(chalk.blue(`New keys saved to: ${csvFile}`));
        console.error(
          chalk.yellow(
            "\nIMPORTANT: Distribute new keys to users. Old keys are no longer valid.",
          ),
        );
      }

      // Report errors
      if (result.errors.length > 0) {
        for (const { keyName, error } of result.errors) {
          console.error(chalk.red(`✗ Failed to rotate ${keyName}: ${error}`));
        }
        console.error(
          chalk.red(`\n${result.errors.length} key(s) failed to rotate`),
        );
        process.exit(1);
      }
    } catch (error) {
      handleCommandError(error);
    }
  });

// BULK-ROTATE command
program
  .command("bulk-rotate")
  .description("Rotate multiple API keys")
  .argument("<file>", "CSV/JSON file with key information (name,hash)")
  .option("--delimiter <char>", "Field delimiter")
  .option("--skip-header [boolean]", "Skip first row", true)
  .option("-y, --confirm", "Skip confirmation prompt")
  .option("-o, --output <file>", "CSV output file (default: auto-generated)")
  .action(async (file, options) => {
    try {
      const opts = mergeOptions<BulkRotateOptions>(options, program.opts());

      // Get preview if confirmation needed
      if (!opts.confirm) {
        const keysToRotate = await parseKeyFile(
          file,
          opts.delimiter,
          opts.skipHeader,
        );

        if (keysToRotate.length === 0) {
          console.error(chalk.yellow("No keys found to rotate"));
          return;
        }

        console.error(
          chalk.blue(`Found ${keysToRotate.length} key(s) in ${file}\n`),
        );
        const confirmed = await confirmAction("rotate", keysToRotate);
        if (!confirmed) {
          return;
        }
      }

      const result = await bulkRotate(file, opts);

      // Display results
      for (const key of result.rotated) {
        console.error(chalk.green(`✓ Rotated: ${key.keyName}`));
      }

      // Output new keys
      if (result.rotated.length > 0) {
        console.error(
          chalk.blue(
            `\n${result.rotated.length} key(s) rotated successfully\n`,
          ),
        );

        const csvFile =
          opts.output ||
          generateOutputFilename(null, ["rotated"], getTodayDate());
        await outputCreatedKeys(result.rotated, csvFile);
        console.error(chalk.blue(`New keys saved to: ${csvFile}`));
        console.error(
          chalk.yellow(
            "\nIMPORTANT: Distribute new keys to users. Old keys are no longer valid.",
          ),
        );
      }

      // Report errors
      if (result.errors.length > 0) {
        for (const { key, error } of result.errors) {
          console.error(chalk.red(`✗ Failed to rotate ${key}: ${error}`));
        }
        console.error(
          chalk.red(`\n${result.errors.length} key(s) failed to rotate`),
        );
        process.exit(1);
      }
    } catch (error) {
      handleCommandError(error);
    }
  });

program.parse();
