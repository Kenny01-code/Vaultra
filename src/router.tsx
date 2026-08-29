import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Don't refetch on window focus — reduces unnecessary network hits
        refetchOnWindowFocus: false,
        // Retry once on failure with exponential backoff
        retry: 1,
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
        // Keep data in cache for 5 min by default
        gcTime: 5 * 60_000,
        staleTime: 20_000,
      },
      mutations: {
        retry: 0,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Preload linked routes on hover/focus
    defaultPreload: "intent",
    defaultPreloadStaleTime: 30_000,
  });

  return router;
};
