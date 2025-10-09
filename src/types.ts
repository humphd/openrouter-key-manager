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

/* https://openrouter.ai/docs/features/provisioning-api-keys#response-format */
export interface OpenRouterKey {
  hash: string;
  name: string;
  label: string;
  disabled: boolean;
  limit?: number;
  limit_remaining?: number;
  usage: number;
  usage_daily: number;
  usage_weekly: number;
  usage_monthly: number;
  created_at: string;
  updated_at: string | null;
}

export interface OpenRouterKeysResponse {
  data: OpenRouterKey[];
}

export interface OpenRouterCreateKeyResponse {
  data: OpenRouterKey;
  key: string;
}

export type OutputFormat = "table" | "json" | "csv";
