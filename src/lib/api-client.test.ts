import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { OpenRouterClient } from "./api-client.js";
import { ApiError } from "../utils/errors.js";

const mockApiKeys = {
  create: vi.fn(),
  list: vi.fn(),
  get: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

const mockWorkspaces = {
  list: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  delete: vi.fn(),
};

vi.mock("@openrouter/sdk", () => ({
  OpenRouter: class {
    apiKeys = mockApiKeys;
    workspaces = mockWorkspaces;
  },
}));

function workspacePages(...pages: unknown[][]) {
  return {
    async *[Symbol.asyncIterator]() {
      for (const data of pages) {
        yield {
          result: {
            data,
          },
        };
      }
    },
  };
}

describe("OpenRouterClient", () => {
  const mockProvisioningKey = "test-provisioning-key";
  let client: OpenRouterClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new OpenRouterClient(mockProvisioningKey, undefined);
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
        },
      };

      mockApiKeys.create.mockResolvedValue(mockResponse);

      const result = await client.createKey(
        "test@example.com student 2025-01-15",
        10,
      );

      expect(result).toEqual({
        key: "sk-or-v1-abc123",
        hash: "hash-abc123",
      });

      expect(mockApiKeys.create).toHaveBeenCalledWith({
        requestBody: {
          name: "test@example.com student 2025-01-15",
          limit: 10,
          expiresAt: undefined,
        },
      });
    });

    test("passes expires_at when provided", async () => {
      mockApiKeys.create.mockResolvedValue({
        key: "sk-or-v1-abc123",
        data: {
          hash: "hash-abc123",
        },
      });

      await client.createKey(
        "test@example.com student 2025-01-15",
        10,
        "2027-12-31T23:59:59Z",
      );

      expect(mockApiKeys.create).toHaveBeenCalledWith({
        requestBody: {
          name: "test@example.com student 2025-01-15",
          limit: 10,
          expiresAt: new Date("2027-12-31T23:59:59Z"),
        },
      });
    });

    test("throws ApiError on failure", async () => {
      mockApiKeys.create.mockRejectedValue(
        new ApiError(
          "Unauthorized: Invalid API key - Invalid provisioning key",
          401,
        ),
      );

      await expect(client.createKey("test@example.com", 10)).rejects.toThrow(
        ApiError,
      );

      await expect(client.createKey("test@example.com", 10)).rejects.toThrow(
        "Invalid provisioning key",
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
            usageDaily: 1.0,
            usageWeekly: 3.0,
            usageMonthly: 5.5,
            limit: 10,
            limitRemaining: 4.5,
            createdAt: "2025-01-15T00:00:00Z",
            updatedAt: null,
          },
          {
            hash: "hash-2",
            name: "key2",
            label: "",
            disabled: false,
            usage: 2.0,
            usageDaily: 0.5,
            usageWeekly: 1.5,
            usageMonthly: 2.0,
            limit: 15,
            limitRemaining: 13.0,
            createdAt: "2025-01-14T00:00:00Z",
            updatedAt: null,
          },
        ],
      };

      mockApiKeys.list
        .mockResolvedValueOnce(mockResponse)
        .mockResolvedValueOnce({ data: [] });

      const result = await client.listKeys(false);

      expect(result).toHaveLength(2);
      expect(result[0].hash).toBe("hash-1");
      expect(mockApiKeys.list).toHaveBeenNthCalledWith(1, {
        includeDisabled: false,
        offset: 0,
      });
      expect(mockApiKeys.list).toHaveBeenNthCalledWith(2, {
        includeDisabled: false,
        offset: 2,
      });
    });

    test("lists keys with disabled keys", async () => {
      mockApiKeys.list.mockResolvedValue({ data: [] });

      await client.listKeys(true);

      expect(mockApiKeys.list).toHaveBeenCalledWith({
        includeDisabled: true,
        offset: 0,
      });
    });

    test("deduplicates overlapping pages and stops when pagination makes no progress", async () => {
      const firstPage = {
        data: [
          {
            hash: "hash-1",
            name: "key1",
            label: "",
            disabled: false,
            usage: 5.5,
            usageDaily: 1.0,
            usageWeekly: 3.0,
            usageMonthly: 5.5,
            limit: 10,
            limitRemaining: 4.5,
            createdAt: "2025-01-15T00:00:00Z",
            updatedAt: null,
          },
        ],
      };

      mockApiKeys.list
        .mockResolvedValueOnce(firstPage)
        .mockResolvedValueOnce(firstPage);

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const verboseClient = new OpenRouterClient(mockProvisioningKey, {
        verbose: true,
      });

      const result = await verboseClient.listKeys(false);

      expect(result).toHaveLength(1);
      expect(result[0].hash).toBe("hash-1");
      expect(mockApiKeys.list).toHaveBeenNthCalledWith(1, {
        includeDisabled: false,
        offset: 0,
      });
      expect(mockApiKeys.list).toHaveBeenNthCalledWith(2, {
        includeDisabled: false,
        offset: 1,
      });
      expect(warnSpy).toHaveBeenCalledWith(
        "API key pagination made no progress; stopping to avoid an infinite loop.",
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
          usageDaily: 1.0,
          usageWeekly: 3.0,
          usageMonthly: 5.0,
          limit: 10,
          limitRemaining: 5.0,
          createdAt: "2025-01-15T00:00:00Z",
          updatedAt: null,
        },
      };

      mockApiKeys.get.mockResolvedValue(mockResponse);

      const result = await client.getKey("hash-abc");

      expect(result.hash).toBe("hash-abc");
      expect(result.name).toBe("test@example.com");
      expect(mockApiKeys.get).toHaveBeenCalledWith({ hash: "hash-abc" });
    });
  });

  describe("setKeyLimit", () => {
    test("sets key limit", async () => {
      mockApiKeys.update.mockResolvedValue({ data: {} });

      await client.setKeyLimit("hash-abc", 25);

      expect(mockApiKeys.update).toHaveBeenCalledWith({
        hash: "hash-abc",
        requestBody: { limit: 25 },
      });
    });
  });

  describe("disableKey", () => {
    test("disables a key", async () => {
      mockApiKeys.update.mockResolvedValue({ data: {} });

      await client.disableKey("hash-abc");

      expect(mockApiKeys.update).toHaveBeenCalledWith({
        hash: "hash-abc",
        requestBody: { disabled: true },
      });
    });
  });

  describe("enableKey", () => {
    test("enables a key", async () => {
      mockApiKeys.update.mockResolvedValue({ data: {} });

      await client.enableKey("hash-abc");

      expect(mockApiKeys.update).toHaveBeenCalledWith({
        hash: "hash-abc",
        requestBody: { disabled: false },
      });
    });
  });

  describe("deleteKeyByHash", () => {
    test("deletes a key by hash", async () => {
      mockApiKeys.delete.mockResolvedValue({});

      await client.deleteKeyByHash("hash-abc");

      expect(mockApiKeys.delete).toHaveBeenCalledWith({ hash: "hash-abc" });
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
            usageDaily: 0,
            usageWeekly: 0,
            usageMonthly: 0,
            createdAt: "2025-01-15T00:00:00Z",
            updatedAt: null,
          },
        ],
      };

      mockApiKeys.list
        .mockResolvedValueOnce(mockListResponse)
        .mockResolvedValueOnce({ data: [] });
      mockApiKeys.delete.mockResolvedValueOnce({});

      await client.deleteKey("test@example.com");

      expect(mockApiKeys.list).toHaveBeenNthCalledWith(1, {
        includeDisabled: false,
        offset: 0,
      });
      expect(mockApiKeys.list).toHaveBeenNthCalledWith(2, {
        includeDisabled: false,
        offset: 1,
      });
      expect(mockApiKeys.delete).toHaveBeenCalledWith({ hash: "hash-abc" });
    });

    test("throws error if key not found", async () => {
      mockApiKeys.list.mockResolvedValue({ data: [] });

      await expect(client.deleteKey("nonexistent@example.com")).rejects.toThrow(
        ApiError,
      );
      await expect(client.deleteKey("nonexistent@example.com")).rejects.toThrow(
        "Key not found",
      );
    });
  });

  describe("listWorkspaces", () => {
    test("lists workspaces across all pages", async () => {
      const firstWorkspace = {
        id: "workspace-1",
        name: "First Workspace",
        slug: "first-workspace",
      };
      const secondWorkspace = {
        id: "workspace-2",
        name: "Second Workspace",
        slug: "second-workspace",
      };

      mockWorkspaces.list.mockResolvedValue(
        workspacePages([firstWorkspace], [secondWorkspace]),
      );

      const result = await client.listWorkspaces();

      expect(result).toEqual([firstWorkspace, secondWorkspace]);
      expect(mockWorkspaces.list).toHaveBeenCalledOnce();
      expect(mockWorkspaces.list).toHaveBeenCalledWith();
    });

    test("returns an empty array when no workspaces exist", async () => {
      mockWorkspaces.list.mockResolvedValue(workspacePages([]));

      await expect(client.listWorkspaces()).resolves.toEqual([]);
    });

    test("converts workspace listing failures to ApiError", async () => {
      mockWorkspaces.list.mockRejectedValue(new Error("Network failure"));

      await expect(client.listWorkspaces()).rejects.toMatchObject({
        name: "ApiError",
        message: "Unexpected error: Network failure",
      });
    });
  });

  describe("getWorkspace", () => {
    test("passes the workspace ID when listing keys", async () => {
      const workspace = {
        id: "workspace-1",
        name: "Test Workspace",
        slug: "test-workspace",
      };

      client = new OpenRouterClient(mockProvisioningKey, { workspace });

      mockApiKeys.list.mockResolvedValue({
        data: [],
      });

      await client.listKeys(false);

      expect(mockApiKeys.list).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: "workspace-1",
        }),
      );
    });

    test("omits workspace ID for the default workspace", async () => {
      mockApiKeys.list.mockResolvedValue({
        data: [],
      });

      await client.listKeys(false);

      expect(mockApiKeys.list).toHaveBeenCalledWith(
        expect.not.objectContaining({
          workspaceId: expect.anything(),
        }),
      );
    });

    test("gets a workspace by ID", async () => {
      const workspace = {
        id: "workspace-1",
        name: "Test Workspace",
        slug: "test-workspace",
      };

      mockWorkspaces.get.mockResolvedValue({
        data: workspace,
      });

      const result = await client.getWorkspace("workspace-1");

      expect(result).toEqual(workspace);
      expect(mockWorkspaces.get).toHaveBeenCalledWith({
        id: "workspace-1",
      });
    });

    test("converts workspace lookup failures to ApiError", async () => {
      mockWorkspaces.get.mockRejectedValue(new Error("Lookup failed"));

      await expect(client.getWorkspace("workspace-1")).rejects.toMatchObject({
        name: "ApiError",
        message: "Unexpected error: Lookup failed",
      });
    });
  });

  describe("createWorkspace", () => {
    test("creates a workspace with an explicit slug", async () => {
      const workspace = {
        id: "workspace-1",
        name: "Test Workspace",
        slug: "custom-slug",
        description: "A test workspace",
      };

      mockWorkspaces.create.mockResolvedValue({
        data: workspace,
      });

      const result = await client.createWorkspace({
        name: "Test Workspace",
        slug: "custom-slug",
        description: "A test workspace",
      });

      expect(result).toEqual(workspace);
      expect(mockWorkspaces.create).toHaveBeenCalledWith({
        createWorkspaceRequest: {
          name: "Test Workspace",
          slug: "custom-slug",
          description: "A test workspace",
        },
      });
    });

    test("uses the workspace name as the default slug", async () => {
      const workspace = {
        id: "workspace-1",
        name: "Test Workspace",
        slug: "Test Workspace",
      };

      mockWorkspaces.create.mockResolvedValue({
        data: workspace,
      });

      await client.createWorkspace({
        name: "Test Workspace",
      });

      expect(mockWorkspaces.create).toHaveBeenCalledWith({
        createWorkspaceRequest: {
          name: "Test Workspace",
          slug: "test-workspace",
          description: undefined,
        },
      });
    });

    test("converts workspace creation failures to ApiError", async () => {
      mockWorkspaces.create.mockRejectedValue(new Error("Creation failed"));

      await expect(
        client.createWorkspace({
          name: "Test Workspace",
        }),
      ).rejects.toMatchObject({
        name: "ApiError",
        message: "Unexpected error: Creation failed",
      });
    });
  });

  describe("deleteWorkspace", () => {
    test("deletes a workspace by ID", async () => {
      mockWorkspaces.delete.mockResolvedValue({
        deleted: true,
      });

      await expect(
        client.deleteWorkspace("workspace-1"),
      ).resolves.toBeUndefined();

      expect(mockWorkspaces.delete).toHaveBeenCalledWith({
        id: "workspace-1",
      });
    });

    test("throws ApiError when the workspace is not deleted", async () => {
      mockWorkspaces.delete.mockResolvedValue({
        deleted: false,
      });

      await expect(client.deleteWorkspace("workspace-1")).rejects.toMatchObject(
        {
          name: "ApiError",
          message:
            "Unable to delete workspace. " +
            "Make sure it contains no API keys and try again",
        },
      );
    });

    test("converts workspace deletion failures to ApiError", async () => {
      mockWorkspaces.delete.mockRejectedValue(new Error("Deletion failed"));

      await expect(client.deleteWorkspace("workspace-1")).rejects.toMatchObject(
        {
          name: "ApiError",
          message: "Unexpected error: Deletion failed",
        },
      );
    });
  });
});
