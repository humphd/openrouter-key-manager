#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import { createCommand } from "../src/commands/create.js";
import { bulkCreateCommand } from "../src/commands/bulk-create.js";
import { deleteCommand } from "../src/commands/delete.js";
import { bulkDeleteCommand } from "../src/commands/bulk-delete.js";
import { listCommand } from "../src/commands/list.js";
import { disableCommand } from "../src/commands/disable.js";
import { reportCommand } from "../src/commands/report.js";
import packageJson from "../package.json" with { type: "json" };
const { version } = packageJson;

const program = new Command();

program
  .name("openrouter-key-manager")
  .description("Manage OpenRouter.ai API keys for students")
  .version(version)
  .option("-k, --provisioning-key <key>", "OpenRouter.ai API Provisioning Key")
  .option("--email-domain <domain>", "Student email domain", "myseneca.ca");

// CREATE command
program
  .command("create")
  .description("Create an API key for a single student")
  .requiredOption(
    "-l, --limit <amount>",
    "Spending limit in dollars",
    parseFloat
  )
  .option("-u, --username <username>", "Student username")
  .option("-e, --email <email>", "Student email")
  .requiredOption("-s, --student-id <id>", "Student ID")
  .requiredOption("-c, --course <course>", "Course code")
  .option("-d, --date <date>", "Issue date (YYYY-MM-DD)")
  .option("-f, --format <format>", "Output format (table, json, csv)", "table")
  .option("-o, --output <file>", "Output file")
  .action(async (options) => {
    try {
      await createCommand(options, program.opts());
    } catch (error) {
      console.error(
        chalk.red("Error:"),
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  });

// BULK-CREATE command
program
  .command("bulk-create")
  .description("Create API keys for multiple students")
  .argument("<file>", "CSV/TSV file with student information")
  .requiredOption(
    "-l, --limit <amount>",
    "Spending limit in dollars",
    parseFloat
  )
  .requiredOption("-c, --course <course>", "Course code")
  .option("-d, --date <date>", "Issue date (YYYY-MM-DD)")
  .option("--delimiter <char>", "Field delimiter")
  .option("--skip-header [boolean]", "Skip first row", true)
  .option("-f, --format <format>", "Output format (table, json, csv)", "table")
  .option("-o, --output <file>", "Output file")
  .action(async (file, options) => {
    try {
      await bulkCreateCommand(file, options, program.opts());
    } catch (error) {
      console.error(
        chalk.red("Error:"),
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  });

// LIST command
program
  .command("list")
  .description("List API keys with usage information")
  .option("-p, --pattern <pattern>", "Filter by glob pattern")
  .option("--include-disabled", "Include disabled keys")
  .option("-f, --format <format>", "Output format (table, json, csv)", "table")
  .option("-o, --output <file>", "Output file")
  .action(async (options) => {
    try {
      await listCommand(options, program.opts());
    } catch (error) {
      console.error(
        chalk.red("Error:"),
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  });

// DISABLE command
program
  .command("disable")
  .description("Disable API key(s)")
  .option("-p, --pattern <pattern>", "Filter by glob pattern")
  .option("--hash <hash>", "Key hash to disable")
  .option("--confirm", "Skip confirmation prompt")
  .action(async (options) => {
    try {
      await disableCommand(options, program.opts());
    } catch (error) {
      console.error(
        chalk.red("Error:"),
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  });

// DELETE command
program
  .command("delete")
  .description("Delete API key(s)")
  .option("-p, --pattern <pattern>", "Filter by glob pattern")
  .option("--hash <hash>", "Key hash to delete")
  .option("--confirm", "Skip confirmation prompt")
  .action(async (options) => {
    try {
      await deleteCommand(options, program.opts());
    } catch (error) {
      console.error(
        chalk.red("Error:"),
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  });

// BULK-DELETE command
program
  .command("bulk-delete")
  .description("Delete API keys for multiple students")
  .argument("<file>", "File with student or key information")
  .option("-c, --course <course>", "Course code (for student roster)")
  .option("-d, --date <date>", "Issue date (for student roster)")
  .option("--delimiter <char>", "Field delimiter")
  .option("--skip-header [boolean]", "Skip first row", true)
  .option("--confirm", "Skip confirmation prompt")
  .action(async (file, options) => {
    try {
      await bulkDeleteCommand(file, options, program.opts());
    } catch (error) {
      console.error(
        chalk.red("Error:"),
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  });

// REPORT command
program
  .command("report")
  .description("Generate usage report as HTML")
  .option("-p, --pattern <pattern>", "Filter by glob pattern")
  .option("--include-disabled", "Include disabled keys")
  .option(
    "-o, --output <file>",
    "Output HTML file (default: report-YYYY-MM-DD.html)"
  )
  .action(async (options) => {
    try {
      await reportCommand(options, program.opts());
    } catch (error) {
      console.error(
        chalk.red("Error:"),
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  });

program.parse();
