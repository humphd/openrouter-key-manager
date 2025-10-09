import { readFile } from "node:fs/promises";
import { parse } from "csv-parse/sync";
import { FileParseError } from "../utils/errors.js";
import type { AccountRecord, KeyRecord } from "../types.js";

function detectDelimiter(filePath: string): string {
  if (filePath.endsWith(".tsv")) {
    return "\t";
  }
  return ",";
}

export async function parseAccountList(
  filePath: string,
  delimiter?: string,
  skipHeader: boolean = true,
): Promise<AccountRecord[]> {
  try {
    const fileContent = await readFile(filePath, "utf-8");
    const detectedDelimiter = delimiter || detectDelimiter(filePath);

    const records = parse(fileContent, {
      bom: true,
      delimiter: detectedDelimiter,
      skip_empty_lines: true,
      trim: true,
    }) as string[][];

    const dataRecords = skipHeader ? records.slice(1) : records;

    return dataRecords.map((record) => {
      if (record.length < 1) {
        throw new FileParseError(
          `Invalid record format. Expected at least 1 column (email), ` +
            `got ${record.length}`,
        );
      }

      return {
        email: record[0],
        tags: record.slice(1).filter((tag) => tag.trim() !== ""),
      };
    });
  } catch (error) {
    if (error instanceof FileParseError) {
      throw error;
    }
    throw new FileParseError(
      `Failed to parse ${filePath}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

export async function parseKeyFile(
  filePath: string,
  delimiter?: string,
  skipHeader: boolean = true,
): Promise<KeyRecord[]> {
  try {
    const fileContent = await readFile(filePath, "utf-8");

    // Try parsing as JSON first
    if (filePath.endsWith(".json")) {
      const data = JSON.parse(fileContent);
      if (!Array.isArray(data)) {
        throw new FileParseError("JSON file must contain an array");
      }
      return data.map((item) => ({
        name: item.name || item.keyName,
        hash: item.hash,
      }));
    }

    // Parse as CSV
    const detectedDelimiter = delimiter || detectDelimiter(filePath);
    const records = parse(fileContent, {
      delimiter: detectedDelimiter,
      skip_empty_lines: true,
      trim: true,
      bom: true,
      columns: skipHeader ? true : false,
    }) as any[];

    return records.map((record) => {
      if (Array.isArray(record)) {
        // Array format: [name, hash, ...]
        if (record.length < 2) {
          throw new FileParseError(
            `Invalid record format. Expected at least 2 columns ` +
              `(name, hash), got ${record.length}`,
          );
        }
        return {
          name: record[0],
          hash: record[1],
        };
      } else {
        // Object format from CSV with headers
        if (!record.name || !record.hash) {
          throw new FileParseError(
            `Missing required fields. Expected 'name' and 'hash' columns`,
          );
        }
        return {
          name: record.name,
          hash: record.hash,
        };
      }
    });
  } catch (error) {
    if (error instanceof FileParseError) {
      throw error;
    }
    throw new FileParseError(
      `Failed to parse key file: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}
