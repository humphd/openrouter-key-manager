import { writeFile } from "node:fs/promises";
import Table from "cli-table3";
import type { KeyRecord, OutputFormat } from "../types.js";

function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.substring(0, maxLength - 3) + "...";
}

function formatAsTable(keys: KeyRecord[]): string {
  const table = new Table({
    head: [
      "Email",
      "Student ID",
      "Course",
      "Issued Date",
      "Key Name",
      "API Key",
      "Hash",
    ],
    colWidths: [25, 12, 9, 13, 42, 42, 12],
  });

  for (const key of keys) {
    table.push([
      key.email,
      key.studentId,
      key.course,
      key.issuedDate,
      truncate(key.keyName, 40),
      truncate(key.apiKey, 40),
      truncate(key.hash, 10),
    ]);
  }

  return table.toString();
}

function formatAsJson(keys: KeyRecord[]): string {
  return JSON.stringify(keys, null, 2);
}

function formatAsCsv(keys: KeyRecord[]): string {
  const lines: string[] = [];

  lines.push("email,student_id,course,issued_date,key_name,api_key,hash");

  for (const key of keys) {
    const escapeCsv = (value: string) => {
      if (value.includes(",") || value.includes('"') || value.includes("\n")) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    lines.push(
      [
        escapeCsv(key.email),
        escapeCsv(key.studentId),
        escapeCsv(key.course),
        escapeCsv(key.issuedDate),
        escapeCsv(key.keyName),
        escapeCsv(key.apiKey),
        escapeCsv(key.hash),
      ].join(",")
    );
  }

  return lines.join("\n");
}

export async function outputResult(
  keys: KeyRecord[],
  format: OutputFormat,
  outputFile?: string
): Promise<void> {
  let formatted: string;

  switch (format) {
    case "table":
      formatted = formatAsTable(keys);
      break;
    case "json":
      formatted = formatAsJson(keys);
      break;
    case "csv":
      formatted = formatAsCsv(keys);
      break;
  }

  if (outputFile) {
    await writeFile(outputFile, formatted, "utf-8");
    console.error(`Output written to ${outputFile}`);
  } else {
    console.log(formatted);
  }
}

// Simple key listing (name, hash, and remaining budget)
export interface KeyListItem {
  name: string;
  hash: string;
  disabled?: boolean;
  remaining?: number | null;
}

function formatKeyListAsTable(keys: KeyListItem[]): string {
  const table = new Table({
    head: ["Name", "Hash", "Remaining", "Disabled"],
  });

  for (const key of keys) {
    table.push([
      key.name,
      key.hash,
      key.remaining !== null && key.remaining !== undefined
        ? `$${key.remaining.toFixed(2)}`
        : "N/A",
      key.disabled ? "Yes" : "No",
    ]);
  }

  return table.toString();
}

function formatKeyListAsJson(keys: KeyListItem[]): string {
  return JSON.stringify(keys, null, 2);
}

function formatKeyListAsCsv(keys: KeyListItem[]): string {
  const lines: string[] = [];
  lines.push("name,hash,remaining,disabled");

  for (const key of keys) {
    const escapeCsv = (value: string | number | boolean) => {
      const str = String(value);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    lines.push(
      [
        escapeCsv(key.name),
        escapeCsv(key.hash),
        key.remaining !== null && key.remaining !== undefined
          ? escapeCsv(key.remaining)
          : "",
        escapeCsv(key.disabled ?? false),
      ].join(",")
    );
  }

  return lines.join("\n");
}

export async function outputKeyList(
  keys: KeyListItem[],
  format: OutputFormat,
  outputFile?: string
): Promise<void> {
  let formatted: string;

  switch (format) {
    case "table":
      formatted = formatKeyListAsTable(keys);
      break;
    case "json":
      formatted = formatKeyListAsJson(keys);
      break;
    case "csv":
      formatted = formatKeyListAsCsv(keys);
      break;
  }

  if (outputFile) {
    await writeFile(outputFile, formatted, "utf-8");
    console.error(`Output written to ${outputFile}`);
  } else {
    console.log(formatted);
  }
}
