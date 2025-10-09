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
import { setLimitCommand } from "../src/commands/set-limit.js";
import { bulkSetLimitCommand } from "../src/commands/bulk-set-limit.js";
import { rotateCommand } from "../src/commands/rotate.js";
import { bulkRotateCommand } from "../src/commands/bulk-rotate.js";
import packageJson from "../package.json" with { type: "json" };
const { version } = packageJson;

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
    parseFloat
  )
  .requiredOption("-e, --email <email>", "Email address")
  .option("-t, --tags <tags...>", "Tags (space-separated)")
  .option("-d, --date <date>", "Issue date (YYYY-MM-DD, default today)")
  .option("-o, --output <file>", "CSV output file (default: auto-generated)")
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
  .description("Create API keys for multiple accounts")
  .argument("<file>", "CSV/TSV file with account information")
  .requiredOption(
    "-l, --limit <amount>",
    "Spending limit in US dollars",
    parseFloat
  )
  .option("-d, --date <date>", "Issue date (YYYY-MM-DD, default today)")
  .option("--delimiter <char>", "Field delimiter")
  .option("--skip-header [boolean]", "Skip first row", true)
  .option("-o, --output <file>", "CSV output file (default: auto-generated)")
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
  .option("--include-disabled", "Include disabled keys (default false)")
  .option("-f, --format <format>", "Output format (table, json, csv)", "table")
  .option("-o, --output <file>", "Output file")
  .option("--full", "Show full name and hash (default: truncated)")
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
  .option("-y, --confirm", "Skip confirmation prompt")
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

// ENABLE command
program
  .command("enable")
  .description("Enable API key(s)")
  .option("-p, --pattern <pattern>", "Filter by glob pattern")
  .option("--hash <hash>", "Key hash to enable")
  .option("-y, --confirm", "Skip confirmation prompt")
  .action(async (options) => {
    try {
      await disableCommand({ ...options, enable: true }, program.opts());
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
  .option("-y, --confirm", "Skip confirmation prompt")
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
  .description("Delete API keys for multiple accounts")
  .argument("<file>", "CSV/JSON file with key information (name,hash)")
  .option("--delimiter <char>", "Field delimiter")
  .option("--skip-header [boolean]", "Skip first row", true)
  .option("-y, --confirm", "Skip confirmation prompt")
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
  .option("--include-disabled", "Include disabled keys (default false)")
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

// SET-LIMIT command
program
  .command("set-limit")
  .description("Set spending limit for API key(s)")
  .requiredOption(
    "-l, --limit <amount>",
    "New spending limit in US dollars",
    parseFloat
  )
  .option("-p, --pattern <pattern>", "Filter by glob pattern")
  .option("--hash <hash>", "Key hash to update")
  .option("-y, --confirm", "Skip confirmation prompt")
  .action(async (options) => {
    try {
      await setLimitCommand(options, program.opts());
    } catch (error) {
      console.error(
        chalk.red("Error:"),
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
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
    parseFloat
  )
  .option("--delimiter <char>", "Field delimiter")
  .option("--skip-header [boolean]", "Skip first row", true)
  .option("-y, --confirm", "Skip confirmation prompt")
  .action(async (file, options) => {
    try {
      await bulkSetLimitCommand(file, options, program.opts());
    } catch (error) {
      console.error(
        chalk.red("Error:"),
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  });

// ROTATE command
program
  .command("rotate")
  .description(
    "Rotate API key(s) (delete old, create new with same name/limit)"
  )
  .option("-p, --pattern <pattern>", "Filter by glob pattern")
  .option("--hash <hash>", "Key hash to rotate")
  .option("-y, --confirm", "Skip confirmation prompt")
  .option("-o, --output <file>", "CSV output file (default: auto-generated)")
  .action(async (options) => {
    try {
      await rotateCommand(options, program.opts());
    } catch (error) {
      console.error(
        chalk.red("Error:"),
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
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
      await bulkRotateCommand(file, options, program.opts());
    } catch (error) {
      console.error(
        chalk.red("Error:"),
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  });

program.parse();
