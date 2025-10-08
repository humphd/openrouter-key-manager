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

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
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
      const errorText = await response.text();
      throw new ApiError(
        `API request failed: ${response.statusText} - ${errorText}`,
        response.status
      );
    }

    return response.json() as Promise<T>;
  }

  async createKey(
    keyName: string,
    limit: number
  ): Promise<{ key: string; hash: string }> {
    const response = await this.request<OpenRouterCreateKeyResponse>("/keys", {
      method: "POST",
      body: JSON.stringify({
        name: keyName,
        limit,
      }),
    });

    return { key: response.key, hash: response.hash };
  }

  async listKeys(): Promise<OpenRouterKey[]> {
    const response = await this.request<OpenRouterKeysResponse>("/keys");
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
