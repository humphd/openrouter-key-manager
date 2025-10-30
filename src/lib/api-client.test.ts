import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { OpenRouterClient } from "./api-client.js";
import { ApiError } from "../utils/errors.js";
import ky, { HTTPError } from "ky";

// Mock ky module
vi.mock("ky");

describe("OpenRouterClient", () => {
  const mockProvisioningKey = "test-provisioning-key";
  let client: OpenRouterClient;
  let mockKyInstance: any;

  beforeEach(() => {
    // Create a mock ky instance
    mockKyInstance = vi.fn();
    mockKyInstance.create = vi.fn().mockReturnValue(mockKyInstance);

    // Mock the ky module to return our mock instance
    vi.mocked(ky.create).mockReturnValue(mockKyInstance);

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

      mockKyInstance.mockResolvedValue({
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

      expect(mockKyInstance).toHaveBeenCalledWith(
        "keys",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            name: "test@example.com student 2025-01-15",
            limit: 10,
          }),
        })
      );
    });

    test("throws ApiError on failure", async () => {
      // Create a mock Response object
      const mockResponse = {
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        headers: new Headers(),
        json: vi.fn().mockResolvedValue({
          error: { message: "Invalid provisioning key" },
        }),
        text: vi.fn().mockResolvedValue("Unauthorized"),
      } as unknown as Response;

      // Mock ky to throw an ApiError (which is what happens after the
      // afterResponse hook processes the HTTPError)
      mockKyInstance.mockRejectedValue(
        new ApiError(
          "Unauthorized: Invalid API key - Invalid provisioning key",
          401
        )
      );

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

      mockKyInstance.mockResolvedValue({
        json: async () => mockResponse,
      });

      const result = await client.listKeys(false);

      expect(result).toHaveLength(2);
      expect(result[0].hash).toBe("hash-1");
      expect(mockKyInstance).toHaveBeenCalledWith(
        "keys?include_disabled=false",
        {}
      );
    });

    test("lists keys with disabled keys", async () => {
      mockKyInstance.mockResolvedValue({
        json: async () => ({ data: [] }),
      });

      await client.listKeys(true);

      expect(mockKyInstance).toHaveBeenCalledWith(
        "keys?include_disabled=true",
        {}
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

      mockKyInstance.mockResolvedValue({
        json: async () => mockResponse,
      });

      const result = await client.getKey("hash-abc");

      expect(result.hash).toBe("hash-abc");
      expect(result.name).toBe("test@example.com");
      expect(mockKyInstance).toHaveBeenCalledWith("keys/hash-abc", {});
    });
  });

  describe("setKeyLimit", () => {
    test("sets key limit", async () => {
      mockKyInstance.mockResolvedValue({
        json: async () => ({}),
      });

      await client.setKeyLimit("hash-abc", 25);

      expect(mockKyInstance).toHaveBeenCalledWith(
        "keys/hash-abc",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ limit: 25 }),
        })
      );
    });
  });

  describe("disableKey", () => {
    test("disables a key", async () => {
      mockKyInstance.mockResolvedValue({
        json: async () => ({}),
      });

      await client.disableKey("hash-abc");

      expect(mockKyInstance).toHaveBeenCalledWith(
        "keys/hash-abc",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ disabled: true }),
        })
      );
    });
  });

  describe("enableKey", () => {
    test("enables a key", async () => {
      mockKyInstance.mockResolvedValue({
        json: async () => ({}),
      });

      await client.enableKey("hash-abc");

      expect(mockKyInstance).toHaveBeenCalledWith(
        "keys/hash-abc",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ disabled: false }),
        })
      );
    });
  });

  describe("deleteKeyByHash", () => {
    test("deletes a key by hash", async () => {
      mockKyInstance.mockResolvedValue({
        json: async () => ({}),
      });

      await client.deleteKeyByHash("hash-abc");

      expect(mockKyInstance).toHaveBeenCalledWith(
        "keys/hash-abc",
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

      mockKyInstance
        .mockResolvedValueOnce({
          json: async () => mockListResponse,
        })
        .mockResolvedValueOnce({
          json: async () => ({}),
        });

      await client.deleteKey("test@example.com");

      expect(mockKyInstance).toHaveBeenCalledTimes(2);
      expect(mockKyInstance).toHaveBeenNthCalledWith(
        1,
        "keys?include_disabled=false",
        {}
      );
      expect(mockKyInstance).toHaveBeenNthCalledWith(
        2,
        "keys/hash-abc",
        expect.objectContaining({
          method: "DELETE",
        })
      );
    });

    test("throws error if key not found", async () => {
      mockKyInstance.mockResolvedValue({
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
