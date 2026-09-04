import type { Workspace } from "@openrouter/sdk/models";

import { OpenRouterClient } from "../lib/api-client.js";
import { getProvisioningKey } from "../utils/config.js";
import { resolveWorkspace } from "../utils/workspaces.js";
import type { GlobalOptions } from "../types.js";

export interface ListWorkspacesOptions extends GlobalOptions {}

export interface CreateWorkspaceOptions extends GlobalOptions {
  name: string;
  slug?: string;
  description?: string;
}

export interface DeleteWorkspaceOptions extends GlobalOptions {
  confirm?: boolean;
}

export async function listWorkspaces(
  options: ListWorkspacesOptions,
): Promise<Workspace[]> {
  const provisioningKey = getProvisioningKey(options.provisioningKey);

  const client = new OpenRouterClient(provisioningKey);
  return client.listWorkspaces();
}

export async function createWorkspace(
  options: CreateWorkspaceOptions,
): Promise<Workspace> {
  const provisioningKey = getProvisioningKey(options.provisioningKey);

  const name = options.name.trim();

  if (!name) {
    throw new Error("Workspace name cannot be empty");
  }

  const client = new OpenRouterClient(provisioningKey);

  return client.createWorkspace({
    name,
    slug: options.slug,
    description: options.description,
  });
}

export async function deleteWorkspace(
  workspace: string,
  options: DeleteWorkspaceOptions,
): Promise<Workspace> {
  const provisioningKey = getProvisioningKey(options.provisioningKey);
  const found = await resolveWorkspace(provisioningKey, workspace);

  if (!found) {
    throw new Error(`Unable to find workspace "${workspace}"`);
  }

  const client = new OpenRouterClient(provisioningKey);
  await client.deleteWorkspace(found.id);

  return found;
}
