import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { OpenRouterClient } from "./api-client.js";
import { ApiError } from "../utils/errors.js";

describe("OpenRouterClient", () => {
  const mockProvisioningKey = "test-provisioning-key";
  let client: OpenRouterClient;

  beforeEach(() => {
    client = new OpenRouterClient(mockProvisioningKey);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("createKey", () => {
    test("creates a key successfully", async () => {
      const mockResponse = {
        key: "sk-or-v1-abc123",
        data: {
          hash: "hash-abc123",
          name: "test@example.com student 2025-01-15",
          label: "",
          disabled: false,
          usage: 0,
          usage_daily: 0,
          usage_weekly: 0,
          usage_monthly: 0,
          limit: 10,
          limit_remaining: 10,
          created_at: "2025-01-15T00:00:00Z",
          updated_at: null,
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.createKey(
        "test@example.com student 2025-01-15",
        10
      );

      expect(result).toEqual({
        key: "sk-or-v1-abc123",
        hash: "hash-abc123",
      });

      expect(fetch).toHaveBeenCalledWith(
        "https://openrouter.ai/api/v1/keys",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockProvisioningKey}`,
            "Content-Type": "application/json",
          }),
          body: JSON.stringify({
            name: "test@example.com student 2025-01-15",
            limit: 10,
          }),
        })
      );
    });

    test("throws ApiError on failure", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: async () => ({
          error: { message: "Invalid provisioning key" },
        }),
      });

      await expect(client.createKey("test@example.com", 10)).rejects.toThrow(
        ApiError
      );

      await expect(client.createKey("test@example.com", 10)).rejects.toThrow(
        "Invalid provisioning key"
      );
    });
  });

  describe("listKeys", () => {
    test("lists keys without disabled keys", async () => {
      const mockResponse = {
        data: [
          {
            hash: "hash-1",
            name: "key1",
            label: "",
            disabled: false,
            usage: 5.5,
            usage_daily: 1.0,
            usage_weekly: 3.0,
            usage_monthly: 5.5,
            limit: 10,
            limit_remaining: 4.5,
            created_at: "2025-01-15T00:00:00Z",
            updated_at: null,
          },
          {
            hash: "hash-2",
            name: "key2",
            label: "",
            disabled: false,
            usage: 2.0,
            usage_daily: 0.5,
            usage_weekly: 1.5,
            usage_monthly: 2.0,
            limit: 15,
            limit_remaining: 13.0,
            created_at: "2025-01-14T00:00:00Z",
            updated_at: null,
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.listKeys(false);

      expect(result).toHaveLength(2);
      expect(result[0].hash).toBe("hash-1");
      expect(fetch).toHaveBeenCalledWith(
        "https://openrouter.ai/api/v1/keys?include_disabled=false",
        expect.any(Object)
      );
    });

    test("lists keys with disabled keys", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });

      await client.listKeys(true);

      expect(fetch).toHaveBeenCalledWith(
        "https://openrouter.ai/api/v1/keys?include_disabled=true",
        expect.any(Object)
      );
    });
  });

  describe("getKey", () => {
    test("gets a key by hash", async () => {
      const mockResponse = {
        data: {
          hash: "hash-abc",
          name: "test@example.com",
          label: "",
          disabled: false,
          usage: 5.0,
          usage_daily: 1.0,
          usage_weekly: 3.0,
          usage_monthly: 5.0,
          limit: 10,
          limit_remaining: 5.0,
          created_at: "2025-01-15T00:00:00Z",
          updated_at: null,
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.getKey("hash-abc");

      expect(result.hash).toBe("hash-abc");
      expect(result.name).toBe("test@example.com");
      expect(fetch).toHaveBeenCalledWith(
        "https://openrouter.ai/api/v1/keys/hash-abc",
        expect.any(Object)
      );
    });
  });

  describe("setKeyLimit", () => {
    test("sets key limit", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await client.setKeyLimit("hash-abc", 25);

      expect(fetch).toHaveBeenCalledWith(
        "https://openrouter.ai/api/v1/keys/hash-abc",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ limit: 25 }),
        })
      );
    });
  });

  describe("disableKey", () => {
    test("disables a key", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await client.disableKey("hash-abc");

      expect(fetch).toHaveBeenCalledWith(
        "https://openrouter.ai/api/v1/keys/hash-abc",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ disabled: true }),
        })
      );
    });
  });

  describe("enableKey", () => {
    test("enables a key", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await client.enableKey("hash-abc");

      expect(fetch).toHaveBeenCalledWith(
        "https://openrouter.ai/api/v1/keys/hash-abc",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ disabled: false }),
        })
      );
    });
  });

  describe("deleteKeyByHash", () => {
    test("deletes a key by hash", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await client.deleteKeyByHash("hash-abc");

      expect(fetch).toHaveBeenCalledWith(
        "https://openrouter.ai/api/v1/keys/hash-abc",
        expect.objectContaining({
          method: "DELETE",
        })
      );
    });
  });

  describe("deleteKey", () => {
    test("deletes a key by name", async () => {
      const mockListResponse = {
        data: [
          {
            hash: "hash-abc",
            name: "test@example.com",
            label: "",
            disabled: false,
            usage: 0,
            usage_daily: 0,
            usage_weekly: 0,
            usage_monthly: 0,
            created_at: "2025-01-15T00:00:00Z",
            updated_at: null,
          },
        ],
      };

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockListResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({}),
        });

      await client.deleteKey("test@example.com");

      expect(fetch).toHaveBeenCalledTimes(2);
      expect(fetch).toHaveBeenNthCalledWith(
        2,
        "https://openrouter.ai/api/v1/keys/hash-abc",
        expect.objectContaining({
          method: "DELETE",
        })
      );
    });

    test("throws error if key not found", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });

      await expect(client.deleteKey("nonexistent@example.com")).rejects.toThrow(
        ApiError
      );
      await expect(client.deleteKey("nonexistent@example.com")).rejects.toThrow(
        "Key not found"
      );
    });
  });
});
