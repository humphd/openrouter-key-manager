// src/lib/file-parser.ts
import { readFile } from "node:fs/promises";
import { parse } from "csv-parse/sync";
import { FileParseError } from "../utils/errors.js";
import type { StudentRecord, KeyRecord } from "../types.js";

function detectDelimiter(filePath: string): string {
  if (filePath.endsWith(".tsv")) {
    return "\t";
  }
  return ",";
}

export async function parseStudentRoster(
  filePath: string,
  delimiter?: string,
  skipHeader: boolean = true
): Promise<StudentRecord[]> {
  try {
    const fileContent = await readFile(filePath, "utf-8");
    const detectedDelimiter = delimiter || detectDelimiter(filePath);

    const records = parse(fileContent, {
      delimiter: detectedDelimiter,
      skip_empty_lines: true,
      trim: true,
    }) as string[][];

    const dataRecords = skipHeader ? records.slice(1) : records;

    return dataRecords.map((record) => {
      if (record.length < 4) {
        throw new FileParseError(
          `Invalid record format. Expected at least 4 columns, ` +
            `got ${record.length}`
        );
      }

      return {
        lastName: record[0],
        firstName: record[1],
        username: record[2],
        studentId: record[3],
      };
    });
  } catch (error) {
    if (error instanceof FileParseError) {
      throw error;
    }
    throw new FileParseError(
      `Failed to parse student roster: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export async function parseKeyFile(
  filePath: string,
  delimiter?: string,
  skipHeader: boolean = true
): Promise<KeyRecord[]> {
  try {
    const fileContent = await readFile(filePath, "utf-8");

    // Try parsing as JSON first
    if (filePath.endsWith(".json")) {
      const data = JSON.parse(fileContent);
      if (!Array.isArray(data)) {
        throw new FileParseError("JSON file must contain an array");
      }
      return data as KeyRecord[];
    }

    // Parse as CSV
    const detectedDelimiter = delimiter || detectDelimiter(filePath);

    const records = parse(fileContent, {
      delimiter: detectedDelimiter,
      skip_empty_lines: true,
      trim: true,
      columns: skipHeader ? true : false,
    }) as any[];

    return records.map((record) => {
      // Handle both array and object formats
      if (Array.isArray(record)) {
        return {
          email: record[0],
          studentId: record[1],
          course: record[2],
          issuedDate: record[3],
          keyName: record[4],
          apiKey: record[5],
          hash: record[6] || "", // Add hash field
        };
      } else {
        return {
          email: record.email,
          studentId: record.student_id || record.studentId,
          course: record.course,
          issuedDate: record.issued_date || record.issuedDate,
          keyName: record.key_name || record.keyName,
          apiKey: record.api_key || record.apiKey,
          hash: record.hash || "", // Add hash field
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
      }`
    );
  }
}
