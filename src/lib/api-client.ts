import { ApiError } from "../utils/errors.js";
import type {
  OpenRouterKey,
  OpenRouterKeysResponse,
  OpenRouterCreateKeyResponse,
} from "../types.js";

export class OpenRouterClient {
  private readonly provisioningKey: string;
  private readonly baseUrl = "https://openrouter.ai/api/v1";

  constructor(provisioningKey: string) {
    this.provisioningKey = provisioningKey;
  }

  private async parseErrorMessage(response: Response): Promise<string> {
    try {
      const errorJson: unknown = await response.json();
      // Extract message from common error formats
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
      // Fall back to text if JSON parsing fails
      return await response.text();
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      Authorization: `Bearer ${this.provisioningKey}`,
      "Content-Type": "application/json",
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorMessage = await this.parseErrorMessage(response);
      throw new ApiError(
        `API request failed: ${response.statusText} - ${errorMessage}`,
        response.status,
      );
    }

    return response.json() as Promise<T>;
  }

  async createKey(
    keyName: string,
    limit: number,
  ): Promise<{ key: string; hash: string }> {
    const response = await this.request<OpenRouterCreateKeyResponse>("/keys", {
      method: "POST",
      body: JSON.stringify({
        name: keyName,
        limit,
      }),
    });

    // https://openrouter.ai/docs/api-reference/api-keys/create-api-key
    return { key: response.key, hash: response.data.hash };
  }

  async listKeys(includeDisabled: boolean = false): Promise<OpenRouterKey[]> {
    // https://openrouter.ai/docs/api-reference/api-keys/list-api-keys#request.query
    const path = `/keys?include_disabled=${includeDisabled ? "true" : "false"}`;
    const response = await this.request<OpenRouterKeysResponse>(path);
    return response.data;
  }

  async disableKey(hash: string): Promise<void> {
    await this.request(`/keys/${hash}`, {
      method: "PATCH",
      body: JSON.stringify({
        disabled: true,
      }),
    });
  }

  async enableKey(hash: string): Promise<void> {
    await this.request(`/keys/${hash}`, {
      method: "PATCH",
      body: JSON.stringify({
        disabled: false,
      }),
    });
  }

  async getKey(hash: string): Promise<OpenRouterKey> {
    const response = await this.request<{ data: OpenRouterKey }>(
      `/keys/${hash}`,
    );
    return response.data;
  }

  async setKeyLimit(hash: string, limit: number): Promise<void> {
    await this.request(`/keys/${hash}`, {
      method: "PATCH",
      body: JSON.stringify({
        limit,
      }),
    });
  }

  async deleteKeyByHash(hash: string): Promise<void> {
    await this.request(`/keys/${hash}`, {
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
