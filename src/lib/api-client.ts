import { OpenRouter } from "@openrouter/sdk";
import {
  OpenRouterDefaultError,
  OpenRouterError,
} from "@openrouter/sdk/models/errors";
import { ApiError } from "../utils/errors.js";
import type { GetKeyData, ListData } from "@openrouter/sdk/models/operations";
import type { Workspace } from "@openrouter/sdk/models";

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_BACKOFF_MS = 60_000;
const INITIAL_BACKOFF_MS = 1_000;
const MAX_RETRY_DELAY_MS = 30_000;

export interface OpenRouterClientOptions {
  /** The Workspace to use if using something other than "Default" */
  workspace?: Pick<Workspace, "id" | "name" | "slug">;

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
  private readonly client: OpenRouter;
  private readonly workspaceId?: string;
  private readonly verbose: boolean;

  constructor(provisioningKey: string, options: OpenRouterClientOptions = {}) {
    const { timeout = DEFAULT_TIMEOUT_MS, verbose = false } = options;

    this.verbose = verbose;
    this.workspaceId = options.workspace?.id;
    this.client = new OpenRouter({
      apiKey: provisioningKey,
      timeoutMs: timeout,
      retryConfig: {
        strategy: "backoff",
        backoff: {
          initialInterval: INITIAL_BACKOFF_MS,
          maxInterval: MAX_RETRY_DELAY_MS,
          exponent: 2,
          maxElapsedTime: MAX_BACKOFF_MS,
        },
        retryConnectionErrors: true,
      },
      debugLogger: verbose ? console : undefined,
    });
  }

  private toApiError(error: unknown): ApiError {
    if (error instanceof ApiError) {
      return error;
    }

    if (
      error instanceof OpenRouterError ||
      error instanceof OpenRouterDefaultError
    ) {
      const status = error.statusCode;
      const errorMessage = error.body || error.message;

      switch (status) {
        case 400:
          return new ApiError(`Bad request: ${errorMessage}`, status);
        case 401:
          return new ApiError(
            `Unauthorized: Invalid API key - ${errorMessage}`,
            status,
          );
        case 404:
          return new ApiError(`Not found: ${errorMessage}`, status);
        case 429:
          return new ApiError(`Rate limit exceeded: ${errorMessage}`, status);
        case 500:
          return new ApiError(`Server error: ${errorMessage}`, status);
        default:
          return new ApiError(
            `API request failed (${status}): ${errorMessage}`,
            status,
          );
      }
    }

    if (error instanceof Error && error.name === "RequestTimeoutError") {
      return new ApiError("Request timeout", 408);
    }

    return new ApiError(
      `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  async createKey(
    keyName: string,
    limit: number,
    expiresAt?: string,
  ): Promise<{ key: string; hash: string }> {
    try {
      const response = await this.client.apiKeys.create({
        requestBody: {
          name: keyName,
          limit,
          expiresAt: expiresAt ? new Date(expiresAt) : undefined,
          workspaceId: this.workspaceId,
        },
      });

      return { key: response.key, hash: response.data.hash };
    } catch (error) {
      throw this.toApiError(error);
    }
  }

  async listKeys(includeDisabled: boolean = false): Promise<ListData[]> {
    try {
      const allKeys: ListData[] = [];
      const seenHashes = new Set<string>();
      let offset = 0;

      // TODO: switch to proper pagination once https://github.com/OpenRouterTeam/typescript-sdk/issues/958 lands
      while (true) {
        const response = await this.client.apiKeys.list({
          includeDisabled,
          offset,
          workspaceId: this.workspaceId,
        });

        if (response.data.length === 0) {
          break;
        }

        let newItems = 0;

        for (const key of response.data) {
          if (seenHashes.has(key.hash)) {
            continue;
          }

          seenHashes.add(key.hash);
          allKeys.push(key);
          newItems += 1;
        }

        if (newItems === 0) {
          if (this.verbose) {
            console.warn(
              "API key pagination made no progress; stopping to avoid an infinite loop.",
            );
          }
          break;
        }

        offset += response.data.length;
      }

      return allKeys;
    } catch (error) {
      throw this.toApiError(error);
    }
  }

  async disableKey(hash: string): Promise<void> {
    try {
      await this.client.apiKeys.update({
        hash,
        requestBody: {
          disabled: true,
        },
      });
    } catch (error) {
      throw this.toApiError(error);
    }
  }

  async enableKey(hash: string): Promise<void> {
    try {
      await this.client.apiKeys.update({
        hash,
        requestBody: {
          disabled: false,
        },
      });
    } catch (error) {
      throw this.toApiError(error);
    }
  }

  async getKey(hash: string): Promise<GetKeyData> {
    try {
      const response = await this.client.apiKeys.get({ hash });
      return response.data;
    } catch (error) {
      throw this.toApiError(error);
    }
  }

  async setKeyLimit(hash: string, limit: number): Promise<void> {
    try {
      await this.client.apiKeys.update({
        hash,
        requestBody: {
          limit,
        },
      });
    } catch (error) {
      throw this.toApiError(error);
    }
  }

  async deleteKeyByHash(hash: string): Promise<void> {
    try {
      await this.client.apiKeys.delete({ hash });
    } catch (error) {
      throw this.toApiError(error);
    }
  }

  async deleteKey(keyName: string): Promise<void> {
    const keys = await this.listKeys();
    const targetKey = keys.find((k) => k.name === keyName);

    if (!targetKey) {
      throw new ApiError(`Key not found: ${keyName}`);
    }

    await this.deleteKeyByHash(targetKey.hash);
  }

  /** Workspaces */
  async listWorkspaces(): Promise<Workspace[]> {
    try {
      const allWorkspaces: Workspace[] = [];
      const response = await this.client.workspaces.list();

      for await (const page of response) {
        allWorkspaces.push(...page.result.data);
      }

      return allWorkspaces;
    } catch (error) {
      throw this.toApiError(error);
    }
  }

  async getWorkspace(workspaceId: string): Promise<Workspace> {
    try {
      const response = await this.client.workspaces.get({ id: workspaceId });
      return response.data;
    } catch (error) {
      throw this.toApiError(error);
    }
  }

  async createWorkspace(options: {
    name: string;
    slug?: string;
    description?: string;
  }): Promise<Workspace> {
    /**
     * Generate a URL-friendly slug: lowercase alphanumeric segments separated by
     * single hyphens,no leading/trailing hyphens
     */
    function generateSlug() {
      return options.name
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    }

    try {
      const response = await this.client.workspaces.create({
        createWorkspaceRequest: {
          name: options.name,
          slug: options.slug ?? generateSlug(),
          description: options.description,
        },
      });
      return response.data;
    } catch (error) {
      throw this.toApiError(error);
    }
  }

  async deleteWorkspace(workspaceId: string): Promise<void> {
    try {
      const response = await this.client.workspaces.delete({ id: workspaceId });
      if (!response.deleted) {
        throw new ApiError(
          "Unable to delete workspace. Make sure it contains no API keys and try again",
        );
      }
    } catch (error) {
      throw this.toApiError(error);
    }
  }
}
