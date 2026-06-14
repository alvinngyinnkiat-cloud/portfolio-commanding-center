import { PersistenceManager } from "./persistence-manager";
import { createCachedRepositories } from "./cached-repositories";
import { createPortfolioServices } from "@/core/services";
import { createServerStockQuoteFetcher } from "@/core/services/stock-price-fetcher";
import { createServerStockHistoryFetcher } from "@/core/services/stock-history-fetcher";
import type { PortfolioServices } from "@/core/services";

export async function createCronRuntime(): Promise<{
  manager: PersistenceManager;
  services: PortfolioServices;
}> {
  const manager = await PersistenceManager.initializeForServer();
  const repos = createCachedRepositories(manager);
  const services = createPortfolioServices(repos, {
    stockQuoteFetcher: createServerStockQuoteFetcher(),
    stockHistoryFetcher: createServerStockHistoryFetcher(),
  });

  return { manager, services };
}
