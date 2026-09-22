import { beforeEach, describe, expect, test, vi } from "vitest";

const listWorkspaces = vi.hoisted(() => vi.fn());

vi.mock("../lib/api-client.js", () => ({
  OpenRouterClient: class {
    listWorkspaces = listWorkspaces;
  },
}));

import { resolveWorkspace, resolveWorkspaceRequired } from "./workspaces.js";

const workspaces = [
  { id: "custom-id", name: "Course", slug: "course" },
  { id: "default-id", name: "Default Workspace", slug: "default" },
];

describe("workspace resolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listWorkspaces.mockResolvedValue(workspaces);
  });

  test("preserves implicit Default behavior for the existing resolver", async () => {
    await expect(resolveWorkspace("test-key")).resolves.toBeUndefined();
    expect(listWorkspaces).not.toHaveBeenCalled();
  });

  test("materializes the Default workspace when its UUID is required", async () => {
    await expect(resolveWorkspaceRequired("test-key")).resolves.toMatchObject({
      id: "default-id",
      slug: "default",
    });
  });

  test("shares ID, name, and slug matching for explicit workspaces", async () => {
    await expect(resolveWorkspace("test-key", "Course")).resolves.toMatchObject(
      { id: "custom-id" },
    );
    await expect(
      resolveWorkspaceRequired("test-key", "custom-id"),
    ).resolves.toMatchObject({ slug: "course" });
  });
});
