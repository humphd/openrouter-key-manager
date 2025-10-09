import { writeFile } from "node:fs/promises";
import Table from "cli-table3";
import type { KeyInfo, OutputFormat } from "../types.js";

function escapeCsv(value: string | number | boolean) {
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// For CREATE operations, we include the actual API key
function formatCreatedKeysAsCsv(keys: KeyInfo[]): string {
  const lines: string[] = [];
  lines.push("name,key,hash");

  for (const key of keys) {
    lines.push(
      [escapeCsv(key.keyName), escapeCsv(key.apiKey), escapeCsv(key.hash)].join(
        ",",
      ),
    );
  }

  return lines.join("\n");
}

export async function outputCreatedKeys(
  keys: KeyInfo[],
  outputFile: string,
): Promise<void> {
  const formatted = formatCreatedKeysAsCsv(keys);
  await writeFile(outputFile, formatted, "utf-8");
}

// For LIST operations we include usage info but no API key
export interface KeyListItem {
  name: string;
  hash: string;
  disabled?: boolean;
  remaining?: number | null;
}

function truncateName(name: string): string {
  // Split at first space to show email
  const spaceIndex = name.indexOf(" ");
  if (spaceIndex === -1) {
    return name;
  }
  return name.substring(0, spaceIndex).concat("...");
}

function truncateHash(hash: string): string {
  // Use first 7 characters
  return hash.substring(0, 7).concat("...");
}

function formatKeyListAsTable(
  keys: KeyListItem[],
  full: boolean = false,
): string {
  const table = new Table({
    head: ["Name", "Hash", "Remaining", "Disabled"],
  });

  for (const key of keys) {
    table.push([
      full ? key.name : truncateName(key.name),
      full ? key.hash : truncateHash(key.hash),
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
    lines.push(
      [
        escapeCsv(key.name),
        escapeCsv(key.hash),
        key.remaining !== null && key.remaining !== undefined
          ? escapeCsv(key.remaining)
          : "",
        escapeCsv(key.disabled ?? false),
      ].join(","),
    );
  }

  return lines.join("\n");
}

export async function outputKeyList(
  keys: KeyListItem[],
  format: OutputFormat,
  outputFile?: string,
  full: boolean = false,
): Promise<void> {
  let formatted: string;

  switch (format) {
    case "table":
      formatted = formatKeyListAsTable(keys, full);
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
