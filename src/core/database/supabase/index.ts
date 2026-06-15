import { isSupabaseConfigured } from "@/lib/supabase";
import { createLocalRepositories } from "../local";
import type { RepositoryBundle } from "../repository-bundle";
import { PersistenceManager } from "./persistence-manager";
import { createCachedRepositories } from "./cached-repositories";
import {
  logPersistenceError,
} from "./supabase-errors";

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
    try {
      manager = await PersistenceManager.initialize();
      repositories = createCachedRepositories(manager);
      return { repos: repositories, manager };
    } catch (error) {
      logPersistenceError(
        "Supabase initialize failed — falling back to local repositories",
        error
      );
      repositories = createLocalRepositories();
      manager = null;
      return { repos: repositories, manager };
    }
  }

  repositories = createLocalRepositories();
  manager = null;
  return { repos: repositories, manager };
}

export function getPersistenceManager(): PersistenceManager | null {
  return manager;
}
