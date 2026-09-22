import { OpenRouterClient } from "../lib/api-client.js";
import type { Workspace } from "@openrouter/sdk/models";

function selectWorkspace(
  workspaces: Workspace[],
  workspaceIdOrName: string,
): Workspace {
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

/**
 * Resolve an explicitly selected workspace. When no selector is provided,
 * return undefined so existing SDK calls retain their implicit-Default behavior.
 */
export async function resolveWorkspace(
  provisioningKey: string,
  workspaceIdOrName?: string,
): Promise<Workspace | undefined> {
  if (!workspaceIdOrName) {
    return undefined;
  }

  const client = new OpenRouterClient(provisioningKey);
  const workspaces = await client.listWorkspaces();
  return selectWorkspace(workspaces, workspaceIdOrName);
}

/**
 * Resolve a workspace to a concrete API object, including looking up the
 * Default workspace when no selector is provided. Use this when a workspace
 * UUID must be sent explicitly, such as in analytics filters.
 */
export async function resolveWorkspaceRequired(
  provisioningKey: string,
  workspaceIdOrName?: string,
): Promise<Workspace> {
  const client = new OpenRouterClient(provisioningKey);
  const workspaces = await client.listWorkspaces();

  if (!workspaceIdOrName) {
    return selectWorkspace(workspaces, "default");
  }

  return selectWorkspace(workspaces, workspaceIdOrName);
}
