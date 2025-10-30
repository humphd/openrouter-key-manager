import ky, { HTTPError, TimeoutError } from "ky";
import { ApiError } from "../utils/errors.js";
import type {
  OpenRouterKey,
  OpenRouterKeysResponse,
  OpenRouterCreateKeyResponse,
} from "../types.js";

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_RATE_LIMIT_DELAY_MS = 5_000;
const MILLISECONDS_PER_SECOND = 1_000;
const MAX_BACKOFF_MS = 60_000;
const INITIAL_BACKOFF_MS = 1_000;
const MAX_RETRY_DELAY_MS = 30_000;

const RETRYABLE_STATUS_CODES = [429, 500, 502, 503, 504];

export interface OpenRouterClientOptions {
  /**
   * Maximum number of retry attempts for failed requests
   * @default 3
   */
  maxRetries?: number;

  /**
   * Request timeout in milliseconds
   * @default 30000
   */
  timeout?: number;

  /**
   * Whether to enable verbose logging
   * @default false
   */
  verbose?: boolean;
}

export class OpenRouterClient {
  private readonly provisioningKey: string;
  private readonly baseUrl = "https://openrouter.ai/api/v1";
  private readonly client: typeof ky;
  private readonly verbose: boolean;

  constructor(provisioningKey: string, options: OpenRouterClientOptions = {}) {
    this.provisioningKey = provisioningKey;

    const {
      maxRetries = DEFAULT_MAX_RETRIES,
      timeout = DEFAULT_TIMEOUT_MS,
      verbose = false,
    } = options;

    this.verbose = verbose;

    this.client = ky.create({
      prefixUrl: this.baseUrl,
      timeout,
      retry: {
        limit: maxRetries,
        methods: ["get", "post", "put", "patch", "delete"],
        // Only retry on server errors and rate limits
        // Don't retry 400, 401, 404 (client errors)
        statusCodes: RETRYABLE_STATUS_CODES,
        backoffLimit: MAX_BACKOFF_MS,
        // Exponential backoff with jitter
        delay: (attemptCount) =>
          Math.min(
            INITIAL_BACKOFF_MS * 2 ** (attemptCount - 1),
            MAX_RETRY_DELAY_MS
          ) +
          Math.random() * INITIAL_BACKOFF_MS,
      },
      hooks: {
        beforeRequest: [
          (request) => {
            request.headers.set(
              "Authorization",
              `Bearer ${this.provisioningKey}`
            );
            request.headers.set("Content-Type", "application/json");
          },
        ],
        beforeRetry: [
          async ({ options, error, retryCount }) => {
            if (!(error instanceof HTTPError)) return;

            const { status } = error.response;

            // Handle rate limiting (429)
            if (status === 429) {
              const delay = this.calculateRateLimitDelay(error.response);

              if (this.verbose) {
                console.warn(
                  `Rate limited (429). Waiting ${delay}ms before retry ${retryCount}/${options.retry.limit}`
                );
              }

              await new Promise((resolve) => setTimeout(resolve, delay));
            }

            // Handle server errors (500)
            if (status === 500 && this.verbose) {
              console.warn(
                `Server error (500). Retry ${retryCount}/${options.retry.limit}`
              );
            }
          },
        ],
        afterResponse: [
          async (_request, _options, response) => {
            // Don't throw for successful responses
            if (response.ok) {
              return response;
            }

            const errorMessage = await this.parseErrorMessage(response);
            const { status } = response;

            // Map status codes to appropriate error messages
            switch (status) {
              case 400:
                throw new ApiError(`Bad request: ${errorMessage}`, status);
              case 401:
                throw new ApiError(
                  `Unauthorized: Invalid API key - ${errorMessage}`,
                  status
                );
              case 404:
                throw new ApiError(`Not found: ${errorMessage}`, status);
              case 429:
                throw new ApiError(
                  `Rate limit exceeded: ${errorMessage}`,
                  status
                );
              case 500:
                throw new ApiError(`Server error: ${errorMessage}`, status);
              default:
                throw new ApiError(
                  `API request failed (${status}): ${response.statusText} - ${errorMessage}`,
                  status
                );
            }
          },
        ],
      },
    });
  }

  private calculateRateLimitDelay(response: Response): number {
    const retryAfter = response.headers.get("Retry-After");
    const resetTime = response.headers.get("X-RateLimit-Reset");

    if (retryAfter) {
      return parseInt(retryAfter, 10) * MILLISECONDS_PER_SECOND;
    }

    if (resetTime) {
      const resetMs = parseInt(resetTime, 10) * MILLISECONDS_PER_SECOND;
      return Math.max(resetMs - Date.now(), MILLISECONDS_PER_SECOND);
    }

    return DEFAULT_RATE_LIMIT_DELAY_MS;
  }

  private async parseErrorMessage(response: Response): Promise<string> {
    try {
      const errorJson: unknown = await response.json();
      if (typeof errorJson === "object" && errorJson !== null) {
        const err = errorJson as Record<string, unknown>;
        const nestedError = err.error as Record<string, unknown> | undefined;
        return (
          (nestedError?.message as string) ||
          (err.message as string) ||
          JSON.stringify(errorJson)
        );
      } else {
        return JSON.stringify(errorJson);
      }
    } catch {
      return await response.text();
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    try {
      const response = await this.client(endpoint, options);
      return await response.json<T>();
    } catch (error) {
      if (error instanceof HTTPError) {
        // Error already handled in afterResponse hook
        throw error;
      } else if (error instanceof TimeoutError) {
        throw new ApiError("Request timeout", 408);
      } else if (error instanceof ApiError) {
        throw error;
      } else {
        throw new ApiError(
          `Unexpected error: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  }

  async createKey(
    keyName: string,
    limit: number
  ): Promise<{ key: string; hash: string }> {
    const response = await this.request<OpenRouterCreateKeyResponse>("keys", {
      method: "POST",
      body: JSON.stringify({
        name: keyName,
        limit,
      }),
    });

    return { key: response.key, hash: response.data.hash };
  }

  async listKeys(includeDisabled: boolean = false): Promise<OpenRouterKey[]> {
    const path = `keys?include_disabled=${includeDisabled ? "true" : "false"}`;
    const response = await this.request<OpenRouterKeysResponse>(path);
    return response.data;
  }

  async disableKey(hash: string): Promise<void> {
    await this.request(`keys/${hash}`, {
      method: "PATCH",
      body: JSON.stringify({
        disabled: true,
      }),
    });
  }

  async enableKey(hash: string): Promise<void> {
    await this.request(`keys/${hash}`, {
      method: "PATCH",
      body: JSON.stringify({
        disabled: false,
      }),
    });
  }

  async getKey(hash: string): Promise<OpenRouterKey> {
    const response = await this.request<{ data: OpenRouterKey }>(
      `keys/${hash}`
    );
    return response.data;
  }

  async setKeyLimit(hash: string, limit: number): Promise<void> {
    await this.request(`keys/${hash}`, {
      method: "PATCH",
      body: JSON.stringify({
        limit,
      }),
    });
  }

  async deleteKeyByHash(hash: string): Promise<void> {
    await this.request(`keys/${hash}`, {
      method: "DELETE",
    });
  }

  async deleteKey(keyName: string): Promise<void> {
    const keys = await this.listKeys();
    const targetKey = keys.find((k) => k.name === keyName);

    if (!targetKey) {
      throw new ApiError(`Key not found: ${keyName}`);
    }

    await this.deleteKeyByHash(targetKey.hash);
  }
}
