import { OpenRouterClient } from "./api-client.js";
import type {
  AnalyticsMetadata,
  AnalyticsQuery,
  RawAnalyticsResult,
} from "./api-client.js";
import { getProvisioningKey } from "../utils/config.js";

export interface RawAnalyticsOptions {
  provisioningKey?: string;
}

/** Fetch the live analytics metric and dimension catalog. */
export async function getAnalyticsMeta(
  options: RawAnalyticsOptions = {},
): Promise<AnalyticsMetadata> {
  const client = new OpenRouterClient(
    getProvisioningKey(options.provisioningKey),
  );
  return client.getAnalyticsMeta();
}

/** Execute an advanced analytics query while preserving all dynamic row fields. */
export async function queryAnalytics(
  query: AnalyticsQuery,
  options: RawAnalyticsOptions = {},
): Promise<RawAnalyticsResult> {
  const client = new OpenRouterClient(
    getProvisioningKey(options.provisioningKey),
  );
  return client.queryAnalytics(query);
}
