import { OpenRouterClient } from "../lib/api-client.js";
import type { Workspace } from "@openrouter/sdk/models";

export async function resolveWorkspace(
  provisioningKey: string,
  workspaceIdOrName?: string,
): Promise<Workspace | undefined> {
  if (!workspaceIdOrName) {
    return undefined;
  }

  const client = new OpenRouterClient(provisioningKey);
  const workspaces = await client.listWorkspaces();

  const matches = workspaces.filter((workspace) => {
    return (
      workspace.id === workspaceIdOrName ||
      workspace.name === workspaceIdOrName ||
      workspace.slug === workspaceIdOrName
    );
  });

  if (matches.length === 1) {
    return matches[0];
  }

  if (matches.length > 1) {
    throw new Error(
      `Workspace "${workspaceIdOrName}" is ambiguous. Use its ID.`,
    );
  }

  throw new Error(
    `Unable to find workspace "${workspaceIdOrName}" by ID, name, or slug.`,
  );
}
