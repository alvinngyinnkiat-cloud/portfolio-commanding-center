import { isSupabaseConfigured } from "@/lib/supabase";
import { createLocalRepositories } from "../local";
import type { RepositoryBundle } from "../repository-bundle";
import { PersistenceManager } from "./persistence-manager";
import { createCachedRepositories } from "./cached-repositories";

let manager: PersistenceManager | null = null;
let repositories: RepositoryBundle | null = null;

export async function initializeRepositories(): Promise<{
  repos: RepositoryBundle;
  manager: PersistenceManager | null;
}> {
  if (repositories) {
    return { repos: repositories, manager };
  }

  if (isSupabaseConfigured()) {
    manager = await PersistenceManager.initialize();
    repositories = createCachedRepositories(manager);
  } else {
    repositories = createLocalRepositories();
    manager = null;
  }

  return { repos: repositories, manager };
}

export function getPersistenceManager(): PersistenceManager | null {
  return manager;
}
