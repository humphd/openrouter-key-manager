export interface AccountRecord {
  email: string;
  tags: string[];
}

export interface KeyRecord {
  name: string;
  hash: string;
}

export interface KeyInfo {
  email: string;
  tags: string[];
  issuedDate: string;
  keyName: string;
  apiKey: string;
  hash: string;
}

import type {
  CreateKeysResponse,
  GetKeyData,
  ListData,
  ListResponse,
} from "@openrouter/sdk/models/operations";

export type OpenRouterKey = ListData | GetKeyData;
export type OpenRouterKeysResponse = ListResponse;
export type OpenRouterCreateKeyResponse = CreateKeysResponse;

export type OutputFormat = "table" | "json" | "csv";

export interface GlobalOptions {
  provisioningKey?: string;
}
